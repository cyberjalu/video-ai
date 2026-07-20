import { NextResponse } from "next/server";
import { createBatch, parseCsvLines, type BatchItemInput } from "@/server/batch/store";
import type { GenerationRequest } from "@/lib/domain/types";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let items: BatchItemInput[] = [];
    let keys: GenerationRequest["keys"] | undefined;
    let templateId = "viral-fast";
    let autoRender = true;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const gemini = String(form.get("gemini") ?? "");
      const pexels = String(form.get("pexels") ?? "");
      templateId = String(form.get("templateId") ?? "viral-fast");
      autoRender = String(form.get("autoRender") ?? "true") !== "false";
      keys = { gemini, pexels: pexels || undefined };
      if (file instanceof File) {
        const text = await file.text();
        items = parseCsvLines(text);
      }
      const urls = String(form.get("urls") ?? "");
      if (urls.trim()) {
        items = [...items, ...parseCsvLines(urls)];
      }
    } else {
      const body = (await req.json()) as {
        items?: BatchItemInput[];
        csv?: string;
        urls?: string;
        templateId?: string;
        autoRender?: boolean;
        keys?: GenerationRequest["keys"];
      };
      if (body.csv) items = parseCsvLines(body.csv);
      if (body.urls) items = [...items, ...parseCsvLines(body.urls)];
      if (body.items?.length) items = [...items, ...body.items];
      keys = body.keys;
      templateId = body.templateId ?? templateId;
      autoRender = body.autoRender ?? true;
    }

    if (!keys?.gemini?.trim()) {
      return NextResponse.json({ error: "Gemini API key required" }, { status: 400 });
    }
    if (!items.length) {
      return NextResponse.json({ error: "No batch items" }, { status: 400 });
    }

    const batch = await createBatch({
      items,
      templateId,
      keys,
      autoRender,
    });

    return NextResponse.json(
      {
        batchId: batch.id,
        status: batch.status,
        itemCount: batch.items.length,
        url: `/batch/${batch.id}`,
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
