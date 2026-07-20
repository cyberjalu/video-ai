import { NextResponse } from "next/server";
import { readJob, writePlan, clearTtsCache, readPlan } from "@/server/jobs/store";
import type { VideoPlan } from "@/lib/domain/types";

export async function PATCH(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const job = await readJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const plan = (await req.json()) as VideoPlan;
  const prev = await readPlan(jobId);
  const voiceChanged =
    prev?.scenes.some((s, i) => s.voiceover.trim() !== plan.scenes[i]?.voiceover.trim()) ?? false;

  await writePlan(jobId, plan);
  if (voiceChanged) await clearTtsCache(jobId);

  return NextResponse.json({ ok: true, plan });
}
