import { NextResponse } from "next/server";
import { readJob, readPlan } from "@/server/jobs/store";

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const job = await readJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found or expired" }, { status: 404 });

  const plan = job.plan ?? (await readPlan(jobId)) ?? undefined;
  const mp4Url =
    job.status === "completed" && job.artifacts?.mp4Path
      ? `/api/jobs/${jobId}/download`
      : undefined;

  return NextResponse.json({
    id: job.id,
    templateId: job.templateId,
    status: job.status,
    stage: job.stage,
    plan,
    artifacts: mp4Url ? { mp4Url, thumbUrl: undefined } : job.artifacts,
    error: job.error,
    expiresAt: job.expiresAt,
  });
}
