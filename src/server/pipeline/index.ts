import type { GenerationRequest, RenderOptions, RenderPreset, TemplateId } from "@/lib/domain/types";
import { getTemplateOrThrow } from "@/templates/registry";
import { appendEvent, jobDir, readJob, readPlan, updateJob, writePlan } from "@/server/jobs/store";
import { publishJobEvent } from "@/server/sse";
import { runWorkerProcess } from "./worker-bridge";

export { runWorkerProcess };

/** @see worker/index.ts extractArticle — extracted in T016 */
export const PIPELINE_STAGE_EXTRACT = "extract" as const;
/** @see worker/index.ts planVideoWithGemini — extracted in T017 */
export const PIPELINE_STAGE_PLAN = "plan" as const;
/** @see worker/index.ts fetchPexels — extracted in T018 */
export const PIPELINE_STAGE_PEXELS = "pexels" as const;
/** @see worker/index.ts geminiTtsToWav — extracted in T019 */
export const PIPELINE_STAGE_TTS = "tts" as const;
/** @see worker/index.ts renderRemotionVideo — extracted in T020 */
export const PIPELINE_STAGE_RENDER = "render" as const;
/** @see worker/index.ts qc — extracted in T021 */
export const PIPELINE_STAGE_QC = "qc" as const;

const running = new Set<string>();

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
    geminiKey: request.keys.gemini,
    pexelsKey: request.keys.pexels,
    preset: options.preset,
    template: options.template as TemplateId,
    layoutMode: options.layout_mode,
    enableCallouts: String(options.enable_callouts),
    enableProgress: String(options.enable_progress),
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

  return args;
}

async function forwardEvents(jobId: string, event: import("@/lib/domain/types").WorkerEvent) {
  const enriched = { ...event, jobId };
  await appendEvent(jobId, enriched);
  publishJobEvent(jobId, enriched);

  if (event.type === "plan_ready" && "plan" in event && event.plan) {
    await writePlan(jobId, event.plan as import("@/lib/domain/types").VideoPlan);
    await updateJob(jobId, { status: "awaiting_review", stage: "plan", plan: event.plan as import("@/lib/domain/types").VideoPlan });
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
  try {
    await runWorkerProcess(buildWorkerArgs(jobId, "plan", request), (event) => {
      void forwardEvents(jobId, event);
    });
    const job = await readJob(jobId);
    if (job && job.status === "planning") {
      await updateJob(jobId, { status: "awaiting_review", stage: null });
    }
  } catch (e) {
    await updateJob(jobId, {
      status: "failed",
      error: e instanceof Error ? e.message : String(e),
      stage: null,
    });
    publishJobEvent(jobId, { type: "error", message: e instanceof Error ? e.message : String(e) });
  } finally {
    running.delete(jobId);
  }
}

export async function runRenderStage(jobId: string, request: GenerationRequest) {
  if (running.has(jobId)) return;
  running.add(jobId);
  await updateJob(jobId, { status: "rendering", stage: "render" });
  try {
    await runWorkerProcess(buildWorkerArgs(jobId, "render", request), (event) => {
      void forwardEvents(jobId, event);
    });
    const plan = await readPlan(jobId);
    const job = await readJob(jobId);
    if (job?.status === "rendering") {
      await updateJob(jobId, { status: "completed", stage: null, plan: plan ?? undefined });
    }
  } catch (e) {
    await updateJob(jobId, {
      status: "failed",
      error: e instanceof Error ? e.message : String(e),
      stage: null,
    });
    publishJobEvent(jobId, { type: "error", message: e instanceof Error ? e.message : String(e) });
  } finally {
    running.delete(jobId);
  }
}
