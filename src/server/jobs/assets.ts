import fs from "node:fs/promises";
import path from "node:path";
import { jobDir } from "@/server/jobs/store";

export async function serveSceneAsset(jobId: string, sceneId: string, ext: string) {
  const p = path.join(jobDir(jobId), "assets", `${sceneId}.${ext}`);
  try {
    const data = await fs.readFile(p);
    const mime = ext.match(/^(mp4|webm|mov)$/i)
      ? "video/mp4"
      : ext.match(/^png$/i)
        ? "image/png"
        : "image/jpeg";
    return new Response(data, { headers: { "Content-Type": mime } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
