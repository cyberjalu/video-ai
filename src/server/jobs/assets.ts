import fs from "node:fs/promises";
import { assertValidJobId, assertValidSceneId, assertValidAssetExt, safeJoinUnder } from "@/server/security/ids";
import { jobDir } from "@/server/jobs/store";

export async function serveSceneAsset(jobId: string, sceneId: string, ext: string) {
  assertValidJobId(jobId);
  assertValidSceneId(sceneId);
  const cleanExt = assertValidAssetExt(ext);
  const p = safeJoinUnder(jobDir(jobId), "assets", `${sceneId}.${cleanExt}`);
  try {
    const data = await fs.readFile(p);
    const mime = cleanExt.match(/^(mp4|webm|mov|mkv)$/i)
      ? "video/mp4"
      : cleanExt.match(/^png$/i)
        ? "image/png"
        : cleanExt.match(/^gif$/i)
          ? "image/gif"
          : "image/jpeg";
    return new Response(data, { headers: { "Content-Type": mime } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
