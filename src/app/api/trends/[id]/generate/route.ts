import { NextResponse } from "next/server";
import { getTrendById } from "@/server/trends";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const topic = await getTrendById(id);
  if (!topic) return NextResponse.json({ error: "Trend not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { templateId?: string };
  const templateId = body.templateId ?? "viral-fast";
  const prompt = `${topic.title}. ${topic.summary}`.trim();

  return NextResponse.json({
    templateId,
    input: topic.url ? { mode: "url" as const, url: topic.url } : { mode: "prompt" as const, prompt },
    suggestedPrompt: prompt,
    generatePath: `/generate/${templateId}?prompt=${encodeURIComponent(prompt)}${topic.url ? `&url=${encodeURIComponent(topic.url)}` : ""}`,
  });
}
