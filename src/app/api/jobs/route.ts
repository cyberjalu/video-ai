import { NextResponse } from "next/server";
import { getTemplateOrThrow } from "@/templates/registry";
import type { GenerationRequest } from "@/lib/domain/types";
import { createJob } from "@/server/jobs/store";
import { runPlanStage } from "@/server/pipeline";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerationRequest;
    const tpl = getTemplateOrThrow(body.templateId);
    const parsed = tpl.inputSchema.safeParse(body.input);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    if (!body.keys?.gemini?.trim()) {
      return NextResponse.json({ error: "Gemini API key is required" }, { status: 400 });
    }

    const job = await createJob(body.templateId, body);
    void runPlanStage(job.id, body);

    return NextResponse.json(
      {
        jobId: job.id,
        status: "planning",
        eventsUrl: `/api/jobs/${job.id}/events`,
        reviewUrl: `/jobs/${job.id}`,
        expiresAt: job.expiresAt,
      },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
