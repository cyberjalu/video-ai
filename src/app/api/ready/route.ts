import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getActiveWorkerCount, getMaxConcurrentRenders } from "@/server/pipeline/worker-bridge";

/** Readiness — accept traffic if disk + capacity ok */
export async function GET() {
  const dataDir = process.env.JOB_DATA_DIR ?? path.join(process.cwd(), "data", "jobs");
  let diskOk = true;
  let freeMb: number | null = null;
  try {
    await fs.mkdir(dataDir, { recursive: true });
    const probe = path.join(dataDir, ".ready");
    await fs.writeFile(probe, String(Date.now()));
    await fs.unlink(probe).catch(() => undefined);
  } catch {
    diskOk = false;
  }

  const active = getActiveWorkerCount();
  const max = getMaxConcurrentRenders();
  const capacityOk = active < max * 2; // soft — queue can grow
  const ok = diskOk && capacityOk;

  return NextResponse.json(
    {
      ok,
      status: ok ? "ready" : "not_ready",
      diskOk,
      freeMb,
      workers: { active, max },
    },
    { status: ok ? 200 : 503 },
  );
}
