import { NextResponse } from "next/server";
import { getTemplateOrThrow } from "@/templates/registry";
import type { GenerationRequest } from "@/lib/domain/types";
import { createJob } from "@/server/jobs/store";
import { runPlanStage } from "@/server/pipeline";
import { mintJobToken, jobTokenCookie } from "@/server/security/job-token";
import { assertSafePublicUrl } from "@/server/security/ssrf";
import { log } from "@/server/logging";

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

    if (body.input.mode === "url" && body.input.url) {
      try {
        await assertSafePublicUrl(body.input.url);
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Unsafe URL" },
          { status: 400 },
        );
      }
    }

    const job = await createJob(body.templateId, body);
    const token = mintJobToken(job.id);
    log.info("job_created", { jobId: job.id, templateId: body.templateId });
    void runPlanStage(job.id, body);

    const res = NextResponse.json(
      {
        jobId: job.id,
        status: "planning",
        eventsUrl: `/api/jobs/${job.id}/events`,
        reviewUrl: `/jobs/${job.id}`,
        expiresAt: job.expiresAt,
        jobToken: token,
      },
      { status: 201 },
    );
    res.headers.append("Set-Cookie", jobTokenCookie(job.id, token, job.expiresAt));
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
