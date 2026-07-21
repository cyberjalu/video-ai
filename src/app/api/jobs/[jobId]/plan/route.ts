import { NextResponse } from "next/server";
import { readJob, writePlan, clearTtsCache, readPlan, jobDir } from "@/server/jobs/store";
import { VideoPlanSchema } from "@/server/security/plan-schema";
import { requireJobToken } from "@/server/security/job-token";
import { assertValidJobId } from "@/server/security/ids";

export async function PATCH(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
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

  const body = await req.json();
  const parsed = VideoPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const plan = parsed.data;
  const prev = await readPlan(jobId);
  const voiceChanged =
    prev?.scenes.some((s, i) => s.voiceover.trim() !== plan.scenes[i]?.voiceover.trim()) ?? false;

  await writePlan(jobId, plan);
  if (voiceChanged) await clearTtsCache(jobId);

  // Advisory: mark plan as user-edited so pipeline never auto-rewrites over manual craft.
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    await fs.writeFile(
      path.join(jobDir(jobId), "user_edited_plan.json"),
      JSON.stringify({ editedAt: new Date().toISOString() }),
    );
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({ ok: true, plan });
}
