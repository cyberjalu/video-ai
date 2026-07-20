import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getActiveWorkerCount, getMaxConcurrentRenders } from "@/server/pipeline/worker-bridge";

const execFileP = promisify(execFile);

async function checkBin(bin: string) {
  await execFileP(bin, ["-version"]);
}

/** Liveness — process is up */
export async function GET() {
  const checks: Record<string, boolean> = {};
  for (const bin of ["ffmpeg", "ffprobe"]) {
    try {
      await checkBin(bin);
      checks[bin] = true;
    } catch {
      checks[bin] = false;
    }
  }
  let playwright = false;
  try {
    const pw = await import("playwright");
    const browser = await pw.chromium.launch({ headless: true });
    await browser.close();
    playwright = true;
  } catch {
    playwright = false;
  }
  const ok = Object.values(checks).every(Boolean) && playwright;
  return NextResponse.json(
    {
      ok,
      status: "live",
      checks: { ...checks, playwright },
      workers: { active: getActiveWorkerCount(), max: getMaxConcurrentRenders() },
    },
    { status: ok ? 200 : 503 },
  );
}
