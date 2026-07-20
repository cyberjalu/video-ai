import { NextResponse } from "next/server";
import { readJob, updateJob } from "@/server/jobs/store";
import { publishJobEvent } from "@/server/sse";
import { cancelWorker } from "@/server/pipeline";
import { requireJobToken } from "@/server/security/job-token";
import { assertValidJobId } from "@/server/security/ids";
import { log } from "@/server/logging";

export async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId: rawId } = await ctx.params;
  let jobId: string;
  try {
    jobId = assertValidJobId(rawId);
  } catch {
    return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
  }

  if (!requireJobToken(req, jobId)) {
    return NextResponse.json({ error: "Missing or invalid job token" }, { status: 403 });
  }

  const job = await readJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const killed = cancelWorker(jobId);
  await updateJob(jobId, { status: "failed", error: "Cancelled by user", stage: null });
  publishJobEvent(jobId, { type: "error", message: "Cancelled by user" });
  log.info("job_cancelled", { jobId, killed });

  return NextResponse.json({ status: "failed", error: "Cancelled", killed });
}
