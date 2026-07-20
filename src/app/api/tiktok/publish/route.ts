import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { readJob, resolveMp4Path, readJsonArtifact, readPlan } from "@/server/jobs/store";
import { initVideoPublish, uploadVideoChunk, tiktokConfigured } from "@/server/tiktok/client";
import type { CaptionPack } from "@/server/viral";
import { log } from "@/server/logging";
import { assertValidJobId } from "@/server/security/ids";

const publishCounts = new Map<string, { count: number; day: string }>();

function checkPublishRate(openId: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const entry = publishCounts.get(openId);
  if (!entry || entry.day !== day) {
    publishCounts.set(openId, { count: 1, day });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count += 1;
  return true;
}

export async function POST(req: Request) {
  if (!tiktokConfigured()) {
    return NextResponse.json({ error: "TikTok not configured on server" }, { status: 503 });
  }

  const body = (await req.json()) as {
    jobId?: string;
    accessToken?: string;
    openId?: string;
    confirm?: boolean;
    title?: string;
  };

  if (!body.confirm) {
    return NextResponse.json({ error: "User confirmation required" }, { status: 400 });
  }
  if (!body.accessToken || !body.jobId) {
    return NextResponse.json({ error: "accessToken and jobId required" }, { status: 400 });
  }

  let jobId: string;
  try {
    jobId = assertValidJobId(body.jobId);
  } catch {
    return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
  }

  if (body.openId && !checkPublishRate(body.openId)) {
    return NextResponse.json({ error: "Publish rate limit: 5 per day per account" }, { status: 429 });
  }

  const job = await readJob(jobId);
  if (!job || job.status !== "completed") {
    return NextResponse.json({ error: "Job not ready" }, { status: 409 });
  }

  const mp4 = await resolveMp4Path(jobId);
  if (!mp4) return NextResponse.json({ error: "MP4 missing" }, { status: 404 });

  const plan = await readPlan(jobId);
  const pack = await readJsonArtifact<CaptionPack>(jobId, "caption_pack.json");
  let title =
    body.title ??
    pack?.fullCaption?.slice(0, 150) ??
    plan?.title ??
    "ClipNews video";

  // Pexels attribution footer when stock was used
  const usedPexels = plan?.scenes.some((s) => s.pexels_credit || s.pexels_url);
  if (usedPexels && !/pexels/i.test(title)) {
    title = `${title.slice(0, 120)} · Footage: Pexels`.slice(0, 150);
  }

  const buffer = await fs.readFile(mp4);
  const videoSize = buffer.length;
  const chunkSize = videoSize;
  const totalChunkCount = 1;

  try {
    const { publish_id, upload_url } = await initVideoPublish(body.accessToken, {
      title,
      videoSize,
      chunkSize,
      totalChunkCount,
    });

    await uploadVideoChunk(
      upload_url,
      buffer,
      `bytes 0-${videoSize - 1}/${videoSize}`,
      videoSize,
    );

    log.info("tiktok_publish_ok", { jobId, publish_id });
    return NextResponse.json({
      ok: true,
      publishId: publish_id,
      title,
      note: "Video uploaded. Check TikTok inbox / drafts for review status.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error("tiktok_publish_failed", { jobId, error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
