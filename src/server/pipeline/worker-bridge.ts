/**
 * Runs the legacy worker subprocess and forwards NDJSON events.
 * Secrets are passed via stdin JSON (never CLI args). Cancel tracks PIDs.
 */
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { parseWorkerEventLine } from "@/lib/domain/workerEvents";
import type { WorkerEvent } from "@/lib/domain/types";
import { log } from "@/server/logging";

export type WorkerCliArgs = Record<string, string | undefined>;

export type WorkerSecrets = {
  geminiKey?: string;
  pexelsKey?: string;
  openaiKey?: string;
};

type ActiveWorker = {
  child: ChildProcess;
  jobId: string;
};

const activeByJob = new Map<string, ActiveWorker>();

function tsxPath(cwd: string) {
  return path.join(cwd, "node_modules", "tsx", "dist", "cli.mjs");
}

function sanitizedEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.GEMINI_API_KEY;
  delete env.PEXELS_API_KEY;
  delete env.OPENAI_API_KEY;
  delete env.JOB_TOKEN_SECRET;
  delete env.TIKTOK_CLIENT_SECRET;
  return env;
}

function maxConcurrent(): number {
  const n = Number(process.env.MAX_CONCURRENT_RENDERS ?? 2);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 2;
}

let activeCount = 0;
const waitQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeCount < maxConcurrent()) {
    activeCount += 1;
    return;
  }
  await new Promise<void>((resolve) => waitQueue.push(resolve));
  activeCount += 1;
}

function releaseSlot() {
  activeCount = Math.max(0, activeCount - 1);
  const next = waitQueue.shift();
  if (next) next();
}

export function getActiveWorkerCount() {
  return activeCount;
}

export function getMaxConcurrentRenders() {
  return maxConcurrent();
}

export function cancelWorker(jobId: string): boolean {
  const active = activeByJob.get(jobId);
  if (!active?.child.pid) return false;
  try {
    active.child.kill("SIGTERM");
    setTimeout(() => {
      if (!active.child.killed) active.child.kill("SIGKILL");
    }, 5000);
    log.info("worker_cancelled", { jobId, pid: active.child.pid });
    return true;
  } catch {
    return false;
  }
}

function timeoutMsForStage(stage: string | undefined): number {
  if (stage === "plan") return Number(process.env.WORKER_PLAN_TIMEOUT_MS ?? 3 * 60_000);
  if (stage === "render") return Number(process.env.WORKER_RENDER_TIMEOUT_MS ?? 10 * 60_000);
  return Number(process.env.WORKER_FULL_TIMEOUT_MS ?? 12 * 60_000);
}

export async function runWorkerProcess(
  jobId: string,
  args: WorkerCliArgs,
  secrets: WorkerSecrets,
  onEvent: (event: WorkerEvent) => void,
): Promise<number> {
  await acquireSlot();
  const cwd = process.cwd();
  const cliArgs = ["./worker/index.ts", "--configStdin", "1"];
  for (const [key, value] of Object.entries(args)) {
    if (value == null || value === "") continue;
    if (key === "geminiKey" || key === "pexelsKey" || key === "openaiKey") continue;
    cliArgs.push(`--${key}`, value);
  }

  const stage = args.stage;
  const timeoutMs = timeoutMsForStage(stage);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxPath(cwd), ...cliArgs], {
      cwd,
      env: sanitizedEnv(),
      stdio: ["pipe", "pipe", "pipe"],
    });

    activeByJob.set(jobId, { child, jobId });
    log.info("worker_started", { jobId, stage, pid: child.pid });

    const payload = JSON.stringify({
      geminiKey: secrets.geminiKey,
      pexelsKey: secrets.pexelsKey,
      openaiKey: secrets.openaiKey,
    });
    child.stdin?.write(payload);
    child.stdin?.end();

    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      log.warn("worker_timeout", { jobId, stage, timeoutMs });
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 3000);
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString("utf-8").split("\n")) {
        const event = parseWorkerEventLine(line);
        if (event) onEvent(event);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      activeByJob.delete(jobId);
      releaseSlot();
      reject(err);
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      activeByJob.delete(jobId);
      releaseSlot();
      log.info("worker_exited", { jobId, code, signal });
      if (code === 0) resolve(code ?? 0);
      else if (signal === "SIGTERM" || signal === "SIGKILL") {
        reject(new Error(stderr.trim() || `Worker cancelled (${signal})`));
      } else {
        reject(new Error(stderr.trim() || `Worker exited with code ${code}`));
      }
    });
  });
}
