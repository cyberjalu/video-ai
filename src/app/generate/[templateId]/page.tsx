"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { WebShell } from "@/components/WebShell";
import { createJob } from "@/lib/api-client";
import { DEFAULT_OPTIONS } from "@/lib/domain/types";
import {
  loadSessionGeminiKey,
  loadSessionPexelsKey,
  loadRenderPrefs,
  pushRecentJobId,
} from "@/lib/session-keys";
import { getTemplateOrThrow } from "@/templates/registry";

function GenerateForm() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const templateId = String(params?.templateId ?? "");
  const tpl = getTemplateOrThrow(templateId);
  const [mode, setMode] = useState<"url" | "prompt" | "script">(
    tpl.id === "youtube-landscape" ? "script" : "prompt",
  );
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const qPrompt = searchParams?.get("prompt");
    const qUrl = searchParams?.get("url");
    if (qUrl) {
      setUrl(qUrl);
      setMode("url");
    } else if (qPrompt) {
      setPrompt(qPrompt);
      setMode("prompt");
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const gemini = loadSessionGeminiKey();
    if (!gemini) {
      router.push(`/settings?return=/generate/${tpl.id}`);
      return;
    }

    setBusy(true);
    try {
      const prefs = loadRenderPrefs();
      const input =
        mode === "url"
          ? { mode: "url" as const, url }
          : mode === "script"
            ? { mode: "script" as const, script }
            : { mode: "prompt" as const, prompt };

      const result = await createJob({
        templateId: tpl.id,
        input,
        options: {
          ...DEFAULT_OPTIONS,
          ...tpl.defaultOptions,
          template: tpl.compositionId,
          preset: prefs.preset ?? tpl.defaultPreset,
          voice: prefs.voice ?? DEFAULT_OPTIONS.voice,
          enable_cut_sfx: prefs.enable_cut_sfx ?? tpl.defaultOptions.enable_cut_sfx ?? false,
          enable_progress: prefs.enable_progress ?? tpl.defaultOptions.enable_progress ?? true,
        },
        keys: { gemini, pexels: loadSessionPexelsKey() || undefined },
      });
      pushRecentJobId(result.jobId);
      router.push(`/jobs/${result.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WebShell
      header={
        <div>
          <Link href={`/templates/${tpl.id}`} className="text-xs text-zinc-500 hover:text-zinc-300">
            ← {tpl.name}
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Generate</h1>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="surface-panel max-w-xl space-y-4 rounded-2xl p-6">
        {tpl.id !== "youtube-landscape" ? (
          <div className="flex gap-2">
            {(["prompt", "url"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === m ? "bg-cyan-400/15 text-cyan-100" : "text-zinc-400"}`}
              >
                {m === "prompt" ? "Prompt" : "URL"}
              </button>
            ))}
          </div>
        ) : null}

        {mode === "url" ? (
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm"
          />
        ) : mode === "script" ? (
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={8}
            placeholder="Paste your script…"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm"
          />
        ) : (
          <div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="Mô tả chủ đề… Có thể dán https://… — tool sẽ mở trang và screenshot đưa vào video."
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm"
            />
            <p className="mt-1.5 text-[11px] text-zinc-500">
              URL trong prompt (tối đa 3) sẽ được truy cập an toàn, chụp headline/đoạn liên quan, rồi gắn vào scene
              screenshot. Tab URL = chỉ một trang nguồn (article mode).
            </p>
          </div>
        )}

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-100 disabled:opacity-50"
        >
          {busy ? "Starting…" : "Generate"}
        </button>
      </form>
    </WebShell>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-400">Loading…</div>}>
      <GenerateForm />
    </Suspense>
  );
}
