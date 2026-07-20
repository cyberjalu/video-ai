import { NextResponse } from "next/server";
import path from "node:path";
import { readJob, readPlan, saveSceneAsset, writePlan } from "@/server/jobs/store";
import { requireJobToken } from "@/server/security/job-token";
import { assertValidJobId, assertValidSceneId } from "@/server/security/ids";

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;

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

  const form = await req.formData();
  const sceneIdRaw = String(form.get("sceneId") ?? "");
  let sceneId: string;
  try {
    sceneId = assertValidSceneId(sceneIdRaw);
  } catch {
    return NextResponse.json({ error: "Invalid sceneId" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "sceneId and file required" }, { status: 400 });
  }

  const isVideo = file.type.startsWith("video/");
  const max = isVideo ? MAX_VIDEO : MAX_IMAGE;
  if (file.size > max) {
    return NextResponse.json({ error: `File too large (max ${max / 1024 / 1024}MB)` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dest = await saveSceneAsset(jobId, sceneId, buffer, file.name);
  const ext = path.extname(dest).slice(1);

  const plan = await readPlan(jobId);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const next = {
    ...plan,
    scenes: plan.scenes.map((s) => {
      if (s.id !== sceneId) return s;
      if (isVideo) {
        return {
          ...s,
          broll_path: dest,
          screenshot_path: undefined,
          layout: "broll" as const,
          pexels_credit: undefined,
          pexels_url: undefined,
        };
      }
      return {
        ...s,
        screenshot_path: dest,
        broll_path: undefined,
        layout: s.layout === "broll" ? ("screenshot" as const) : (s.layout ?? "screenshot"),
        pexels_credit: undefined,
        pexels_url: undefined,
      };
    }),
  };
  await writePlan(jobId, next);

  return NextResponse.json({
    sceneId,
    assetUrl: `/api/jobs/${jobId}/assets/${sceneId}/${ext}`,
    plan: next,
  });
}
