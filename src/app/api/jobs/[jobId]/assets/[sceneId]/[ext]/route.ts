import { serveSceneAsset } from "@/server/jobs/assets";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ jobId: string; sceneId: string; ext: string }> },
) {
  const { jobId, sceneId, ext } = await ctx.params;
  return serveSceneAsset(jobId, sceneId, ext);
}
