import { NextResponse } from "next/server";
import { appendEvent, readJob, readPlan, readRequest, updateJob } from "@/server/jobs/store";
import { clearRunningJob, runPlanStage, runRenderStage } from "@/server/pipeline";
import { publishJobEvent } from "@/server/sse";
import type { GenerationRequest } from "@/lib/domain/types";
import { requireJobToken } from "@/server/security/job-token";
import { assertValidJobId } from "@/server/security/ids";
import { log } from "@/server/logging";

/**
 * Resume a failed/cancelled job:
 * - has plan → restart render
 * - no plan → restart planning
 * Useful after rate limits or user cancel.
 */
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

  if (job.status !== "failed") {
    return NextResponse.json(
      { error: `Cannot continue while job is ${job.status}` },
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

  const plan = job.plan ?? (await readPlan(jobId));
  const mode = plan ? "render" : "plan";

  clearRunningJob(jobId);
  await updateJob(jobId, {
    status: mode === "render" ? "rendering" : "planning",
    error: undefined,
    stage: mode === "render" ? "render" : "plan",
    plan: plan ?? undefined,
  });

  const event = {
    type: "log" as const,
    message:
      mode === "render"
        ? "Continuing render after stop (rate limit / cancel)."
        : "Restarting plan after stop (rate limit / cancel).",
    jobId,
  };
  await appendEvent(jobId, event);
  publishJobEvent(jobId, event);

  log.info("job_continue", { jobId, mode });

  if (mode === "render") {
    void runRenderStage(jobId, request);
    return NextResponse.json({ status: "rendering", mode }, { status: 202 });
  }

  void runPlanStage(jobId, request);
  return NextResponse.json({ status: "planning", mode }, { status: 202 });
}
