import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { readJob, resolveMp4Path } from "@/server/jobs/store";
import { assertValidJobId } from "@/server/security/ids";

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId: rawId } = await ctx.params;
  let jobId: string;
  try {
    jobId = assertValidJobId(rawId);
  } catch {
    return new Response("Invalid job id", { status: 400 });
  }

  const job = await readJob(jobId);
  if (!job) return new Response("Not found", { status: 404 });

  const mp4 = await resolveMp4Path(jobId);
  if (!mp4) return new Response("Not ready", { status: 404 });

  const st = await stat(mp4);
  const nodeStream = createReadStream(mp4);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(st.size),
      "Content-Disposition": `attachment; filename="clipnews-${jobId.slice(0, 8)}.mp4"`,
    },
  });
}
