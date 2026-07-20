import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createJob, jobDir, readJob } from "@/server/jobs/store";
import { runPlanStage, runRenderStage } from "@/server/pipeline";
import type { GenerationRequest, RenderOptions } from "@/lib/domain/types";
import { DEFAULT_OPTIONS } from "@/lib/domain/types";
import { getTemplateOrThrow } from "@/templates/registry";
import { log } from "@/server/logging";

export type BatchItemInput = {
  mode: "url" | "prompt";
  url?: string;
  prompt?: string;
  templateId?: string;
};

export type BatchItem = {
  index: number;
  jobId?: string;
  input: BatchItemInput;
  status: "queued" | "planning" | "awaiting_review" | "rendering" | "completed" | "failed";
  error?: string;
};

export type Batch = {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "partial";
  createdAt: string;
  expiresAt: string;
  templateId: string;
  items: BatchItem[];
  autoRender: boolean;
};

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data", "batches");
const MAX_ITEMS = 20;

function batchRoot() {
  return process.env.BATCH_DATA_DIR ?? DEFAULT_DATA_DIR;
}

function batchDir(id: string) {
  return path.join(batchRoot(), id);
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export async function createBatch(opts: {
  items: BatchItemInput[];
  templateId?: string;
  keys: GenerationRequest["keys"];
  options?: Partial<RenderOptions>;
  autoRender?: boolean;
}): Promise<Batch> {
  if (!opts.items.length) throw new Error("Batch requires at least one item");
  if (opts.items.length > MAX_ITEMS) throw new Error(`Max ${MAX_ITEMS} items per batch`);

  const id = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 72 * 3600_000);
  const templateId = opts.templateId ?? "viral-fast";
  const tpl = getTemplateOrThrow(templateId);

  const batch: Batch = {
    id,
    status: "queued",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    templateId,
    autoRender: opts.autoRender ?? true,
    items: opts.items.map((input, index) => ({
      index,
      input: { ...input, templateId: input.templateId ?? templateId },
      status: "queued",
    })),
  };

  await ensureDir(batchDir(id));
  await fs.writeFile(path.join(batchDir(id), "meta.json"), JSON.stringify(batch, null, 2));
  // keys only in memory for runner — never persisted
  void runBatch(id, opts.keys, opts.options ?? {}, tpl.defaultOptions);
  return batch;
}

export async function readBatch(id: string): Promise<Batch | null> {
  try {
    const raw = await fs.readFile(path.join(batchDir(id), "meta.json"), "utf-8");
    return JSON.parse(raw) as Batch;
  } catch {
    return null;
  }
}

async function writeBatch(batch: Batch) {
  await fs.writeFile(path.join(batchDir(batch.id), "meta.json"), JSON.stringify(batch, null, 2));
}

async function runBatch(
  batchId: string,
  keys: GenerationRequest["keys"],
  optionOverrides: Partial<RenderOptions>,
  templateDefaults: Partial<RenderOptions>,
) {
  const batch = await readBatch(batchId);
  if (!batch) return;
  batch.status = "running";
  await writeBatch(batch);
  log.info("batch_start", { batchId, items: batch.items.length });

  for (const item of batch.items) {
    try {
      const tplId = item.input.templateId ?? batch.templateId;
      const tpl = getTemplateOrThrow(tplId);
      const request: GenerationRequest = {
        templateId: tplId,
        input:
          item.input.mode === "url"
            ? { mode: "url", url: item.input.url }
            : { mode: "prompt", prompt: item.input.prompt },
        options: {
          ...DEFAULT_OPTIONS,
          ...tpl.defaultOptions,
          ...templateDefaults,
          ...optionOverrides,
          template: tpl.compositionId,
          preset: optionOverrides.preset ?? tpl.defaultPreset,
        },
        keys,
        skipAutoReplan: true,
      };

      const job = await createJob(tplId, request);
      item.jobId = job.id;
      item.status = "planning";
      await writeBatch(batch);

      await runPlanStage(job.id, request);
      let current = await readJob(job.id);
      if (current?.status === "awaiting_review" && batch.autoRender) {
        item.status = "rendering";
        await writeBatch(batch);
        await runRenderStage(job.id, request);
        current = await readJob(job.id);
      }

      if (current?.status === "completed") item.status = "completed";
      else if (current?.status === "awaiting_review") item.status = "awaiting_review";
      else {
        item.status = "failed";
        item.error = current?.error ?? "Unknown failure";
      }
    } catch (e) {
      item.status = "failed";
      item.error = e instanceof Error ? e.message : String(e);
      log.error("batch_item_failed", { batchId, index: item.index, error: item.error });
    }
    await writeBatch(batch);
  }

  const failed = batch.items.filter((i) => i.status === "failed").length;
  const completed = batch.items.filter((i) => i.status === "completed").length;
  batch.status =
    failed === 0 ? "completed" : completed === 0 ? "failed" : "partial";
  await writeBatch(batch);
  log.info("batch_done", { batchId, status: batch.status, completed, failed });
}

export function parseCsvLines(text: string): BatchItemInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const items: BatchItemInput[] = [];
  for (const line of lines) {
    // url,prompt  OR single url OR single prompt
    const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts[0]?.startsWith("http://") || parts[0]?.startsWith("https://")) {
      items.push({ mode: "url", url: parts[0], prompt: parts[1] });
    } else if (parts[0]) {
      items.push({ mode: "prompt", prompt: parts.join(", ") });
    }
  }
  return items.slice(0, MAX_ITEMS);
}

export async function buildCaptionsCsv(batchId: string): Promise<string> {
  const batch = await readBatch(batchId);
  if (!batch) throw new Error("Batch not found");
  const rows = ["index,jobId,status,title,caption"];
  for (const item of batch.items) {
    let title = "";
    let caption = "";
    if (item.jobId) {
      try {
        const planRaw = await fs.readFile(
          path.join(jobDir(item.jobId), "plan", "video_plan.json"),
          "utf-8",
        );
        const plan = JSON.parse(planRaw) as { title?: string; scenes?: Array<{ caption_lines?: string[] }> };
        title = plan.title ?? "";
        caption = (plan.scenes ?? []).flatMap((s) => s.caption_lines ?? []).join(" | ");
        try {
          const packRaw = await fs.readFile(path.join(jobDir(item.jobId), "caption_pack.json"), "utf-8");
          const pack = JSON.parse(packRaw) as { fullCaption?: string };
          if (pack.fullCaption) caption = pack.fullCaption.replace(/\n/g, " ");
        } catch {
          /* optional */
        }
      } catch {
        /* missing */
      }
    }
    rows.push(
      [item.index, item.jobId ?? "", item.status, csvEscape(title), csvEscape(caption)].join(","),
    );
  }
  return rows.join("\n");
}

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export { MAX_ITEMS };
