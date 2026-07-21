import { NextResponse } from "next/server";
import { readJob, readPlan, readRequest, updateJob } from "@/server/jobs/store";
import { clearRunningJob, runRenderStage } from "@/server/pipeline";
import type { GenerationRequest } from "@/lib/domain/types";
import { requireJobToken } from "@/server/security/job-token";
import { assertValidJobId } from "@/server/security/ids";

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
  if (job.status !== "awaiting_review" && job.status !== "completed" && job.status !== "failed") {
    return NextResponse.json({ error: "Job is not ready for render" }, { status: 409 });
  }

  const plan = job.plan ?? (await readPlan(jobId));
  if (job.status === "failed" && !plan) {
    return NextResponse.json(
      { error: "No plan to render — use Continue to restart planning" },
      { status: 409 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { keys?: GenerationRequest["keys"] };
  const stored = await readRequest(jobId);
  if (!stored) return NextResponse.json({ error: "Missing job request" }, { status: 400 });

  const gemini = body.keys?.gemini?.trim();
  if (!gemini) {
    return NextResponse.json({ error: "Gemini API key required" }, { status: 400 });
  }

  const request: GenerationRequest = {
    ...stored,
    keys: { gemini, pexels: body.keys?.pexels },
  };

  clearRunningJob(jobId);
  await updateJob(jobId, { status: "rendering", error: undefined, stage: "render", plan: plan ?? undefined });
  void runRenderStage(jobId, request);
  return NextResponse.json({ status: "rendering" }, { status: 202 });
}
