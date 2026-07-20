import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { GenerationRequest, RenderJob, VideoPlan } from "@/lib/domain/types";

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data", "jobs");
const DEFAULT_TTL_HOURS = 72;

function dataRoot() {
  return process.env.JOB_DATA_DIR ?? DEFAULT_DATA_DIR;
}

function ttlHours() {
  const n = Number(process.env.JOB_TTL_HOURS ?? DEFAULT_TTL_HOURS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_HOURS;
}

export function jobDir(jobId: string) {
  return path.join(dataRoot(), jobId);
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export async function createJob(templateId: string, request: GenerationRequest): Promise<RenderJob> {
  const id = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours() * 3600_000);
  const dir = jobDir(id);
  await ensureDir(dir);
  await ensureDir(path.join(dir, "plan"));
  await ensureDir(path.join(dir, "assets"));

  const job: RenderJob = {
    id,
    templateId,
    status: "queued",
    stage: null,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    projectDir: dir,
  };

  await fs.writeFile(path.join(dir, "meta.json"), JSON.stringify(job, null, 2));
  const { keys: _keys, ...requestWithoutKeys } = request;
  await fs.writeFile(path.join(dir, "request.json"), JSON.stringify(requestWithoutKeys, null, 2));
  return job;
}

export async function readJob(jobId: string): Promise<RenderJob | null> {
  try {
    const raw = await fs.readFile(path.join(jobDir(jobId), "meta.json"), "utf-8");
    const job = JSON.parse(raw) as RenderJob;
    if (new Date(job.expiresAt) < new Date()) return null;
    return job;
  } catch {
    return null;
  }
}

export async function readRequest(jobId: string): Promise<Omit<GenerationRequest, "keys"> | null> {
  try {
    const raw = await fs.readFile(path.join(jobDir(jobId), "request.json"), "utf-8");
    return JSON.parse(raw) as Omit<GenerationRequest, "keys">;
  } catch {
    return null;
  }
}

export async function updateJob(jobId: string, patch: Partial<RenderJob>): Promise<RenderJob> {
  const job = await readJob(jobId);
  if (!job) throw new Error("Job not found or expired");
  const next = { ...job, ...patch };
  await fs.writeFile(path.join(jobDir(jobId), "meta.json"), JSON.stringify(next, null, 2));
  return next;
}

export async function readPlan(jobId: string): Promise<VideoPlan | null> {
  try {
    const raw = await fs.readFile(path.join(jobDir(jobId), "plan", "video_plan.json"), "utf-8");
    return JSON.parse(raw) as VideoPlan;
  } catch {
    return null;
  }
}

export async function writePlan(jobId: string, plan: VideoPlan) {
  await ensureDir(path.join(jobDir(jobId), "plan"));
  await fs.writeFile(path.join(jobDir(jobId), "plan", "video_plan.json"), JSON.stringify(plan, null, 2));
  await updateJob(jobId, { plan });
}

export async function appendEvent(jobId: string, event: unknown) {
  await fs.appendFile(path.join(jobDir(jobId), "events.ndjson"), `${JSON.stringify(event)}\n`);
}

export async function clearTtsCache(jobId: string) {
  const ttsDir = path.join(jobDir(jobId), "tts");
  try {
    const files = await fs.readdir(ttsDir);
    await Promise.all(files.map((f) => fs.unlink(path.join(ttsDir, f)).catch(() => undefined)));
  } catch {
    /* no tts dir yet */
  }
}

export async function saveSceneAsset(
  jobId: string,
  sceneId: string,
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const ext = path.extname(filename) || ".bin";
  const dest = path.join(jobDir(jobId), "assets", `${sceneId}${ext}`);
  await ensureDir(path.dirname(dest));
  await fs.writeFile(dest, buffer);
  return dest;
}

export function assetUrl(jobId: string, sceneId: string, ext: string) {
  return `/api/jobs/${jobId}/assets/${sceneId}${ext}`;
}

export async function resolveMp4Path(jobId: string): Promise<string | null> {
  const candidates = [
    path.join(jobDir(jobId), "render", "out.mp4"),
    path.join(jobDir(jobId), "render", "final.mp4"),
  ];
  for (const p of candidates) {
    try {
      await fs.access(p);
      return p;
    } catch {
      /* try next */
    }
  }
  return null;
}
