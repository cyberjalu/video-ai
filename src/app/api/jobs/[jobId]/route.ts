import { NextResponse } from "next/server";
import { readJob, readPlan, readJsonArtifact, resolveMp4Path } from "@/server/jobs/store";
import { assertValidJobId } from "@/server/security/ids";
import type { CaptionPack, CraftReport, ViralQcResult } from "@/server/viral";

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId: rawId } = await ctx.params;
  let jobId: string;
  try {
    jobId = assertValidJobId(rawId);
  } catch {
    return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
  }

  const job = await readJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found or expired" }, { status: 404 });

  const plan = job.plan ?? (await readPlan(jobId)) ?? undefined;
  const mp4 = await resolveMp4Path(jobId);
  const mp4Url = job.status === "completed" && mp4 ? `/api/jobs/${jobId}/download` : undefined;
  const captionPack = await readJsonArtifact<CaptionPack>(jobId, "caption_pack.json");
  const qc = await readJsonArtifact<ViralQcResult>(jobId, "qc.json");
  const craftReport = await readJsonArtifact<CraftReport>(jobId, "craft.json");

  return NextResponse.json({
    id: job.id,
    templateId: job.templateId,
    status: job.status,
    stage: job.stage,
    plan,
    artifacts: mp4Url ? { mp4Url, thumbUrl: undefined } : job.artifacts,
    captionPack: captionPack ?? undefined,
    qc: qc ?? undefined,
    craftReport: craftReport ?? undefined,
    error: job.error,
    expiresAt: job.expiresAt,
  });
}
