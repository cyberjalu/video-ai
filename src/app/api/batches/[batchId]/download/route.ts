import { buildCaptionsCsv, readBatch } from "@/server/batch/store";
import { resolveMp4Path } from "@/server/jobs/store";
import { createReadStream, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

export async function GET(_req: Request, ctx: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await ctx.params;
  const batch = await readBatch(batchId);
  if (!batch) return new Response("Not found", { status: 404 });

  const csv = await buildCaptionsCsv(batchId);
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "clipnews-batch-"));
  const csvPath = path.join(tmp, "captions.csv");
  await fs.writeFile(csvPath, csv);

  const mp4Args: string[] = [];
  for (const item of batch.items) {
    if (!item.jobId) continue;
    const mp4 = await resolveMp4Path(item.jobId);
    if (mp4 && existsSync(mp4)) {
      const dest = path.join(tmp, `video-${String(item.index).padStart(2, "0")}.mp4`);
      await fs.copyFile(mp4, dest);
      mp4Args.push(dest);
    }
  }

  const zipPath = path.join(tmp, `batch-${batchId.slice(0, 8)}.zip`);
  const zipOk = await new Promise<boolean>((resolve) => {
    const child = spawn("zip", ["-j", zipPath, csvPath, ...mp4Args], { stdio: "ignore" });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });

  if (!zipOk) {
    // Fallback: captions CSV only
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="batch-${batchId.slice(0, 8)}-captions.csv"`,
      },
    });
  }

  const nodeStream = createReadStream(zipPath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;
  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="batch-${batchId.slice(0, 8)}.zip"`,
    },
  });
}
