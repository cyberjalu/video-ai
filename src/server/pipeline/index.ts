import type { GenerationRequest, RenderOptions, RenderPreset, TemplateId } from "@/lib/domain/types";
import { getTemplateOrThrow } from "@/templates/registry";
import { appendEvent, jobDir, readJob, readPlan, updateJob, writePlan } from "@/server/jobs/store";
import { publishJobEvent } from "@/server/sse";
import { log } from "@/server/logging";
import { runWorkerProcess, cancelWorker } from "./worker-bridge";
import {
  generateViralBrief,
  generateCaptionPack,
  runViralQc,
  runCraftQc,
  buildCraftRewriteAppendix,
  craftModeForPreset,
  type CraftReport,
} from "@/server/viral";

export { runWorkerProcess, cancelWorker };

/** @see worker/index.ts — stage markers for future module extraction */
export const PIPELINE_STAGE_EXTRACT = "extract" as const;
export const PIPELINE_STAGE_PLAN = "plan" as const;
export const PIPELINE_STAGE_PEXELS = "pexels" as const;
export const PIPELINE_STAGE_TTS = "tts" as const;
export const PIPELINE_STAGE_RENDER = "render" as const;
export const PIPELINE_STAGE_QC = "qc" as const;

const running = new Set<string>();

/** Clear in-memory lock so cancel → continue is not blocked by a stale entry. */
export function clearRunningJob(jobId: string) {
  running.delete(jobId);
}

function buildWorkerArgs(
  jobId: string,
  stage: "plan" | "render",
  request: GenerationRequest,
): Record<string, string | undefined> {
  const tpl = getTemplateOrThrow(request.templateId);
  const options: RenderOptions = {
    ...tpl.defaultOptions,
    ...request.options,
    template: tpl.compositionId,
    preset: (request.options?.preset ?? tpl.defaultPreset) as RenderPreset,
  };

  const args: Record<string, string | undefined> = {
    stage,
    outDir: jobDir(jobId),
    projectDir: jobDir(jobId),
    preset: options.preset,
    template: options.template as TemplateId,
    layoutMode: options.layout_mode,
    enableCallouts: String(options.enable_callouts),
    enableProgress: String(options.enable_progress),
    enableCutSfx: String(options.enable_cut_sfx ?? false),
    voice: options.voice ?? "Zephyr",
    contentModel: options.contentModel ?? "gemini-3.5-flash",
    audioModel: options.audioModel ?? "gemini-3.1-flash-tts-preview",
  };

  if (request.input.mode === "url" && request.input.url) args.url = request.input.url;
  if (request.input.mode === "prompt" && request.input.prompt) args.prompt = request.input.prompt;
  if (request.input.mode === "script" && request.input.script) {
    args.script = request.input.script;
    args.platform = "youtube";
  }
  if (request.viralBriefPrompt) args.viralBrief = request.viralBriefPrompt;

  return args;
}

async function forwardEvents(jobId: string, event: import("@/lib/domain/types").WorkerEvent) {
  const enriched = { ...event, jobId };
  await appendEvent(jobId, enriched);
  publishJobEvent(jobId, enriched);

  if (event.type === "plan_ready" && "plan" in event && event.plan) {
    await writePlan(jobId, event.plan as import("@/lib/domain/types").VideoPlan);
    await updateJob(jobId, {
      status: "awaiting_review",
      stage: "plan",
      plan: event.plan as import("@/lib/domain/types").VideoPlan,
    });
  }
  if (event.type === "step_done" && event.step === "plan" && "plan" in event && event.plan) {
    await writePlan(jobId, event.plan as import("@/lib/domain/types").VideoPlan);
  }
  if (event.type === "done") {
    if ("planReady" in event && event.planReady) {
      await updateJob(jobId, { status: "awaiting_review", stage: null });
    } else if ("mp4" in event && event.mp4) {
      await updateJob(jobId, {
        status: "completed",
        stage: null,
        artifacts: { mp4Path: String(event.mp4) },
      });
    }
  }
  if (event.type === "error") {
    await updateJob(jobId, { status: "failed", error: event.message, stage: null });
  }
}

export async function runPlanStage(jobId: string, request: GenerationRequest) {
  if (running.has(jobId)) return;
  running.add(jobId);
  await updateJob(jobId, { status: "planning", stage: "plan" });
  log.info("plan_stage_start", { jobId, templateId: request.templateId });

  try {
    // Viral brief enrichment (Phase 2) — best-effort
    try {
      const brief = await generateViralBrief(request);
      if (brief) {
        request = { ...request, viralBriefPrompt: brief.enhancedPrompt };
        await writeViralArtifact(jobId, "viral_brief.json", brief);
      }
    } catch (e) {
      log.warn("viral_brief_failed", { jobId, error: e instanceof Error ? e.message : String(e) });
    }

    await runWorkerProcess(
      jobId,
      buildWorkerArgs(jobId, "plan", request),
      { geminiKey: request.keys.gemini, pexelsKey: request.keys.pexels },
      (event) => {
        void forwardEvents(jobId, event);
      },
    );
    let plan = await readPlan(jobId);
    if (plan) {
      const qc = runViralQc(plan);
      await writeViralArtifact(jobId, "qc.json", qc);

      const source = await loadCraftSourceContext(jobId, request);
      const craftMode = craftModeForPreset(request.options.preset, request.templateId);
      let craft: CraftReport | null = null;
      try {
        craft = await runCraftQc(plan, {
          mode: craftMode,
          sourceText: source.text,
          hasSourceScreenshots: source.hasScreenshots,
          geminiKey: request.keys.gemini,
          contentModel: request.options.contentModel,
          rewritten: Boolean(request.skipAutoReplan),
        });
        if (craft) await writeViralArtifact(jobId, "craft.json", craft);
      } catch (e) {
        log.warn("craft_qc_failed", { jobId, error: e instanceof Error ? e.message : String(e) });
      }

      const structuralFail = !qc.pass && request.options.preset === "viral_30_45";
      const craftFail = Boolean(craft && !craft.pass && craftMode === "full");
      const userEdited = await hasUserEditedPlan(jobId);

      if (!request.skipAutoReplan && !userEdited && (structuralFail || craftFail)) {
        const fixParts: string[] = [];
        if (structuralFail) {
          fixParts.push(
            "FIX RETENTION: ensure 8-10 scenes, hook<=5s, mandatory re_hook mid-video, duration 30-45s.",
          );
        }
        if (craft && craftFail) fixParts.push(buildCraftRewriteAppendix(craft));
        log.info("qc_replan", {
          jobId,
          structural: qc.reasons,
          craft: craft?.reasons,
        });
        publishJobEvent(jobId, {
          type: "log",
          message: `QC/craft soft-fail — re-planning once (${[...qc.reasons, ...(craft?.reasons ?? [])].join("; ")})`,
        });
        running.delete(jobId);
        await runPlanStage(jobId, {
          ...request,
          skipAutoReplan: true,
          viralBriefPrompt: `${request.viralBriefPrompt ?? ""}\n\n${fixParts.join("\n")}`,
        });
        return;
      }

      if (craft) {
        publishJobEvent(jobId, {
          type: "log",
          message: `Craft: ${craft.pass ? "pass" : "warn"} (${craft.score}) — ${craft.reasons.join("; ") || "ok"}`,
        });
      }

      try {
        const pack = await generateCaptionPack(request.keys.gemini, plan);
        if (pack) await writeViralArtifact(jobId, "caption_pack.json", pack);
      } catch (e) {
        log.warn("caption_pack_failed", { jobId, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const job = await readJob(jobId);
    if (job && (job.status === "planning" || job.status === "queued")) {
      await updateJob(jobId, { status: "awaiting_review", stage: null });
    }
    log.info("plan_stage_done", { jobId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error("plan_stage_failed", { jobId, error: message });
    await updateJob(jobId, { status: "failed", error: message, stage: null });
    publishJobEvent(jobId, { type: "error", message });
  } finally {
    running.delete(jobId);
  }
}

export async function runRenderStage(jobId: string, request: GenerationRequest) {
  if (running.has(jobId)) return;
  running.add(jobId);
  await updateJob(jobId, { status: "rendering", stage: "render" });
  log.info("render_stage_start", { jobId });

  try {
    await runWorkerProcess(
      jobId,
      buildWorkerArgs(jobId, "render", request),
      { geminiKey: request.keys.gemini, pexelsKey: request.keys.pexels },
      (event) => {
        void forwardEvents(jobId, event);
      },
    );
    const plan = await readPlan(jobId);
    const job = await readJob(jobId);
    if (plan) {
      const qc = runViralQc(plan);
      await writeViralArtifact(jobId, "qc.json", qc);
      publishJobEvent(jobId, {
        type: "log",
        message: `QC: ${qc.pass ? "pass" : "warn"} (${qc.score}) — ${qc.reasons.join("; ") || "ok"}`,
      });
    }
    if (job?.status === "rendering") {
      await updateJob(jobId, { status: "completed", stage: null, plan: plan ?? undefined });
    }
    log.info("render_stage_done", { jobId });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error("render_stage_failed", { jobId, error: message });
    await updateJob(jobId, { status: "failed", error: message, stage: null });
    publishJobEvent(jobId, { type: "error", message });
  } finally {
    running.delete(jobId);
  }
}

async function writeViralArtifact(jobId: string, name: string, data: unknown) {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = jobDir(jobId);
  await fs.writeFile(path.join(dir, name), JSON.stringify(data, null, 2));
}

async function hasUserEditedPlan(jobId: string): Promise<boolean> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    await fs.access(path.join(jobDir(jobId), "user_edited_plan.json"));
    return true;
  } catch {
    return false;
  }
}

async function loadCraftSourceContext(
  jobId: string,
  request: GenerationRequest,
): Promise<{ text: string; hasScreenshots: boolean }> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = jobDir(jobId);
  const chunks: string[] = [];
  if (request.input.prompt) chunks.push(request.input.prompt);
  if (request.input.url) chunks.push(request.input.url);
  try {
    const articlePath = path.join(dir, "article", "article.json");
    const raw = await fs.readFile(articlePath, "utf-8");
    const article = JSON.parse(raw) as { title?: string; text?: string };
    if (article.title) chunks.push(article.title);
    if (article.text) chunks.push(article.text.slice(0, 12_000));
  } catch {
    /* optional */
  }
  let hasScreenshots = false;
  try {
    const metaPath = path.join(dir, "screenshots", "screenshots_meta.json");
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8")) as Record<string, unknown>;
    hasScreenshots = Object.keys(meta).some((k) => k !== "promptUrls");
  } catch {
    /* optional */
  }
  return { text: chunks.join("\n"), hasScreenshots };
}
