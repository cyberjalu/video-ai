import { NextResponse } from "next/server";
import { readBatch } from "@/server/batch/store";

export async function GET(_req: Request, ctx: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await ctx.params;
  const batch = await readBatch(batchId);
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const completed = batch.items.filter((i) => i.status === "completed").length;
  const failed = batch.items.filter((i) => i.status === "failed").length;
  const pct = batch.items.length
    ? Math.round(((completed + failed) / batch.items.length) * 100)
    : 0;

  return NextResponse.json({
    ...batch,
    progress: { completed, failed, total: batch.items.length, percent: pct },
  });
}
