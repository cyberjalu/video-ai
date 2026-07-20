import fs from "node:fs/promises";
import { readJob, resolveMp4Path } from "@/server/jobs/store";

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const job = await readJob(jobId);
  if (!job) return new Response("Not found", { status: 404 });

  const mp4 = await resolveMp4Path(jobId);
  if (!mp4) return new Response("Not ready", { status: 404 });

  const data = await fs.readFile(mp4);
  return new Response(data, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="clipnews-${jobId.slice(0, 8)}.mp4"`,
    },
  });
}
