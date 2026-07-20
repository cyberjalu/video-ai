"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { WebShell } from "@/components/WebShell";
import { createJob } from "@/lib/api-client";
import { DEFAULT_OPTIONS } from "@/lib/domain/types";
import { loadSessionGeminiKey, loadSessionPexelsKey, pushRecentJobId } from "@/lib/session-keys";
import { getTemplateOrThrow } from "@/templates/registry";

export default function GeneratePage() {
  const router = useRouter();
  const params = useParams();
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
          preset: tpl.defaultPreset,
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
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="Describe the video topic…"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm"
          />
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
