import fs from "node:fs/promises";
import path from "node:path";
import type { GoogleGenAI } from "@google/genai";

/**
 * Cross-process Gemini RPM gate for free-tier keys (~15 RPM).
 * Default target: 10 RPM + min gap so Peak RPM stays under the red line.
 *
 * Env:
 * - GEMINI_MAX_RPM (default 10)
 * - GEMINI_MIN_GAP_MS (default ceil(60000 / RPM))
 * - GEMINI_RETRY_MAX (default 5)
 */

type RateState = { timestamps: number[] };

export type GeminiWaitInfo = { waitMs: number; reason: string };

export type GeminiThrottleOpts = {
  label?: string;
  onWait?: (info: GeminiWaitInfo) => void;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function dataRoot() {
  const jobs = process.env.JOB_DATA_DIR ?? path.join(process.cwd(), "data", "jobs");
  return path.dirname(path.resolve(jobs));
}

function statePath() {
  return path.join(dataRoot(), "gemini-rate.json");
}

function lockPath() {
  return `${statePath()}.lock`;
}

function maxRpm() {
  const n = Number(process.env.GEMINI_MAX_RPM ?? 10);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 10;
}

function minGapMs() {
  const rpm = maxRpm();
  const fallback = Math.ceil(60_000 / rpm);
  const n = Number(process.env.GEMINI_MIN_GAP_MS ?? fallback);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function retryMax() {
  const n = Number(process.env.GEMINI_RETRY_MAX ?? 5);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 5;
}

export function isGeminiRateLimitError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  const status =
    typeof err === "object" && err && "status" in err
      ? Number((err as { status?: unknown }).status)
      : NaN;
  return (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    (msg.includes("quota") && msg.includes("exceed"))
  );
}

async function readState(): Promise<RateState> {
  try {
    const raw = await fs.readFile(statePath(), "utf-8");
    const parsed = JSON.parse(raw) as RateState;
    return { timestamps: Array.isArray(parsed.timestamps) ? parsed.timestamps : [] };
  } catch {
    return { timestamps: [] };
  }
}

async function writeState(state: RateState) {
  await fs.mkdir(dataRoot(), { recursive: true });
  const tmp = `${statePath()}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state), "utf-8");
  await fs.rename(tmp, statePath());
}

async function withFileLock<T>(fn: () => Promise<T>): Promise<T> {
  await fs.mkdir(dataRoot(), { recursive: true });
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    try {
      const fh = await fs.open(lockPath(), "wx");
      try {
        return await fn();
      } finally {
        await fh.close().catch(() => {});
        await fs.unlink(lockPath()).catch(() => {});
      }
    } catch (e) {
      const code = typeof e === "object" && e && "code" in e ? String((e as { code?: unknown }).code) : "";
      if (code !== "EEXIST") throw e;
      await sleep(40 + Math.random() * 80);
    }
  }
  throw new Error("Gemini rate-limit lock timeout");
}

/** Compute how long to wait before the next request may proceed. Pure helper for tests. */
export function computeGeminiWaitMs(
  timestamps: number[],
  now: number,
  rpm: number,
  gapMs: number,
): number {
  const windowStart = now - 60_000;
  const recent = timestamps.filter((t) => t > windowStart).sort((a, b) => a - b);
  let wait = 0;
  if (recent.length >= rpm) {
    wait = Math.max(wait, recent[0]! + 60_000 - now + 25);
  }
  if (recent.length > 0 && gapMs > 0) {
    wait = Math.max(wait, recent[recent.length - 1]! + gapMs - now);
  }
  return Math.max(0, wait);
}

async function acquireGeminiSlot(opts?: GeminiThrottleOpts): Promise<void> {
  const rpm = maxRpm();
  const gap = minGapMs();

  for (;;) {
    const waitMs = await withFileLock(async () => {
      const now = Date.now();
      const state = await readState();
      const wait = computeGeminiWaitMs(state.timestamps, now, rpm, gap);
      if (wait > 0) return wait;

      const windowStart = now - 60_000;
      const recent = state.timestamps.filter((t) => t > windowStart);
      recent.push(now);
      await writeState({ timestamps: recent });
      return 0;
    });

    if (waitMs <= 0) return;

    const reason = `free-tier safety — stay under ${rpm} RPM (Peak requests/min)`;
    opts?.onWait?.({ waitMs, reason: opts.label ? `${opts.label}: ${reason}` : reason });
    await sleep(waitMs);
  }
}

/**
 * Acquire RPM slot, call Gemini, retry with backoff on 429 / RESOURCE_EXHAUSTED.
 */
export async function throttledGeminiCall<T>(
  fn: () => Promise<T>,
  opts?: GeminiThrottleOpts,
): Promise<T> {
  const attempts = retryMax();
  let last: unknown;

  for (let i = 1; i <= attempts; i++) {
    try {
      await acquireGeminiSlot(opts);
      return await fn();
    } catch (e) {
      last = e;
      if (!isGeminiRateLimitError(e) || i >= attempts) throw e;
      const backoff = Math.min(90_000, 2500 * 2 ** (i - 1)) + Math.random() * 750;
      opts?.onWait?.({
        waitMs: backoff,
        reason: `429 / RESOURCE_EXHAUSTED backoff (attempt ${i}/${attempts})`,
      });
      await sleep(backoff);
    }
  }

  throw last instanceof Error ? last : new Error(String(last));
}

/** Convenience wrapper around `ai.models.generateContent`. */
export async function generateGeminiContent(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  opts?: GeminiThrottleOpts,
) {
  return throttledGeminiCall(() => ai.models.generateContent(params), opts);
}
