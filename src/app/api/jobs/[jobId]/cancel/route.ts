import { NextResponse } from "next/server";
import { readJob, updateJob } from "@/server/jobs/store";
import { publishJobEvent } from "@/server/sse";

export async function POST(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const job = await readJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  await updateJob(jobId, { status: "failed", error: "Cancelled by user", stage: null });
  publishJobEvent(jobId, { type: "error", message: "Cancelled by user" });

  return NextResponse.json({ status: "failed", error: "Cancelled" });
}
