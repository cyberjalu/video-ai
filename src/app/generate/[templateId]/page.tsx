"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WebShell } from "@/components/WebShell";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
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
  const [geminiReady, setGeminiReady] = useState(false);
  const [pexelsReady, setPexelsReady] = useState(false);

  useEffect(() => {
    setGeminiReady(Boolean(loadSessionGeminiKey()));
    setPexelsReady(Boolean(loadSessionPexelsKey()));
  }, []);

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
          contentModel: prefs.contentModel ?? DEFAULT_OPTIONS.contentModel,
          audioModel: prefs.audioModel ?? DEFAULT_OPTIONS.audioModel,
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

  const modes = (["prompt", "url"] as const).filter(() => tpl.id !== "youtube-landscape");

  return (
    <WebShell
      header={
        <div>
          <Link href={`/templates/${tpl.id}`} className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink)]">
            ← {tpl.name}
          </Link>
          <h1 className="display-title mt-2 text-2xl text-[var(--ink)]">Generate</h1>
          <p className="mt-1 text-sm text-[var(--ink-faint)]">Local BYOK · keys stay in this browser</p>
        </div>
      }
    >
      {!geminiReady ? (
        <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
          <strong className="font-semibold">Gemini key missing.</strong> Add it in Settings (session
          only on your machine).{" "}
          <Link href={`/settings?return=/generate/${tpl.id}`} className="underline underline-offset-2">
            Open Settings
          </Link>
        </div>
      ) : null}
      {geminiReady && !pexelsReady ? (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-[var(--ink-muted)]">
          Pexels key optional — without it, empty scenes won’t auto-fill stock media.{" "}
          <Link href="/settings" className="text-[var(--signal)]/90 hover:underline">
            Add Pexels
          </Link>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="surface-panel-strong max-w-xl space-y-5 rounded-[22px] p-6">
        {tpl.id !== "youtube-landscape" ? (
          <div className="relative flex gap-1 rounded-2xl border border-white/[0.08] bg-black/30 p-1">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="relative z-10 flex-1 rounded-xl px-3 py-2 text-xs font-semibold capitalize text-[var(--ink-muted)] transition"
              >
                {mode === m ? (
                  <motion.span
                    layoutId="generate-mode-pill"
                    className="absolute inset-0 rounded-xl bg-[var(--signal-dim)] ring-1 ring-[color-mix(in_srgb,var(--signal)_35%,transparent)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <span className={`relative ${mode === m ? "text-[var(--signal)]" : ""}`}>
                  {m === "prompt" ? "Prompt" : "URL"}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {mode === "url" ? (
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[color-mix(in_srgb,var(--signal)_40%,transparent)]"
          />
        ) : mode === "script" ? (
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={8}
            placeholder="Paste your script…"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[color-mix(in_srgb,var(--signal)_40%,transparent)]"
          />
        ) : (
          <div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="Mô tả chủ đề… Có thể dán https://… — tool sẽ mở trang và screenshot đưa vào video."
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-[color-mix(in_srgb,var(--signal)_40%,transparent)]"
            />
            <p className="mt-1.5 text-[11px] text-[var(--ink-faint)]">
              URL trong prompt (tối đa 3) sẽ được truy cập an toàn, chụp headline/đoạn liên quan, rồi gắn
              vào scene screenshot.
            </p>
          </div>
        )}

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <PrimaryButton type="submit" disabled={busy} isLoading={busy}>
            {busy ? "Starting…" : "Generate"}
          </PrimaryButton>
          <Link href={`/templates/${tpl.id}`}>
            <SecondaryButton type="button">Back</SecondaryButton>
          </Link>
        </div>
      </form>
    </WebShell>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--ink-muted)]">Loading…</div>}>
      <GenerateForm />
    </Suspense>
  );
}
