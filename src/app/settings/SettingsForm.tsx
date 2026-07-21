"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, ExternalLink, KeyRound, Mic2 } from "lucide-react";
import { WebShell } from "@/components/WebShell";
import { PrimaryButton } from "@/components/Buttons";
import {
  loadSessionGeminiKey,
  loadSessionPexelsKey,
  saveSessionKeys,
  isRememberKeysEnabled,
  loadRenderPrefs,
  saveRenderPrefs,
  type SessionRenderPrefs,
} from "@/lib/session-keys";
import {
  DEFAULT_GEMINI_TTS_VOICE,
  GEMINI_TTS_VOICES,
  resolveGeminiTtsVoice,
  type GeminiTtsVoiceName,
} from "@/lib/gemini-voices";
import {
  DEFAULT_GEMINI_AUDIO_MODEL,
  DEFAULT_GEMINI_CONTENT_MODEL,
  GEMINI_AUDIO_MODELS,
  GEMINI_CONTENT_MODELS,
  resolveGeminiAudioModel,
  resolveGeminiContentModel,
  type GeminiAudioModelId,
  type GeminiContentModelId,
} from "@/lib/gemini-models";
import { cn } from "@/lib/cn";

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-white/[0.08] bg-black/45 px-3.5 py-2.5 text-sm text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition placeholder:text-[var(--ink-faint)] hover:border-white/[0.12] focus:border-[color-mix(in_srgb,var(--signal)_40%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--signal)_20%,transparent)]";

const selectClass = cn(
  fieldClass,
  "cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.85rem_center] bg-no-repeat pr-10",
);

const selectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' viewBox='0 0 24 24' stroke='%23717a8a' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export default function SettingsForm() {
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("return") ?? "/";
  const [gemini, setGemini] = useState(() => loadSessionGeminiKey());
  const [pexels, setPexels] = useState(() => loadSessionPexelsKey());
  const [remember, setRemember] = useState(() => isRememberKeysEnabled());
  const prefsInit = loadRenderPrefs();
  const [preset, setPreset] = useState<SessionRenderPrefs["preset"]>(
    prefsInit.preset ?? "viral_30_45",
  );
  const [voice, setVoice] = useState<GeminiTtsVoiceName>(() =>
    resolveGeminiTtsVoice(prefsInit.voice ?? DEFAULT_GEMINI_TTS_VOICE),
  );
  const [contentModel, setContentModel] = useState<GeminiContentModelId>(() =>
    resolveGeminiContentModel(prefsInit.contentModel ?? DEFAULT_GEMINI_CONTENT_MODEL),
  );
  const [audioModel, setAudioModel] = useState<GeminiAudioModelId>(() =>
    resolveGeminiAudioModel(prefsInit.audioModel ?? DEFAULT_GEMINI_AUDIO_MODEL),
  );
  const [cutSfx, setCutSfx] = useState(prefsInit.enable_cut_sfx ?? false);
  const [progress, setProgress] = useState(prefsInit.enable_progress ?? true);
  const [saved, setSaved] = useState(false);

  const selectedVoice = useMemo(
    () => GEMINI_TTS_VOICES.find((v) => v.name === voice) ?? GEMINI_TTS_VOICES[0],
    [voice],
  );

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    saveSessionKeys(gemini, pexels, remember);
    saveRenderPrefs({
      preset,
      voice,
      contentModel,
      audioModel,
      enable_cut_sfx: cutSfx,
      enable_progress: progress,
    });
    setSaved(true);
  }

  return (
    <WebShell
      header={
        <div>
          <Link href="/" className="text-xs text-[var(--ink-faint)] transition hover:text-[var(--ink)]">
            ← Home
          </Link>
          <h1 className="display-title mt-2 text-2xl text-[var(--ink)] md:text-3xl">Settings</h1>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[var(--ink-muted)]">
            Keys stay in this browser. ClipNews never hosts your credentials.
          </p>
        </div>
      }
    >
      <form onSubmit={onSave} className="mx-auto max-w-xl space-y-5">
        {/* Keys */}
        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-[color-mix(in_srgb,var(--signal)_25%,transparent)] bg-[var(--signal-dim)] text-[var(--signal)]">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)]">API keys</h2>
              <p className="text-[11px] text-[var(--ink-faint)]">BYOK for Gemini TTS and optional Pexels</p>
            </div>
          </div>
          <div className="space-y-4 px-5 py-5">
            <label className="block">
              <span className="text-[12px] font-medium text-[var(--ink-muted)]">Gemini API key</span>
              <input
                type="password"
                value={gemini}
                onChange={(e) => setGemini(e.target.value)}
                autoComplete="off"
                placeholder="AIza…"
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-[var(--ink-muted)]">Pexels API key</span>
              <span className="ml-1.5 text-[11px] text-[var(--ink-faint)]">optional</span>
              <input
                type="password"
                value={pexels}
                onChange={(e) => setPexels(e.target.value)}
                autoComplete="off"
                placeholder="Optional stock footage"
                className={fieldClass}
              />
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-1 py-1 transition hover:border-white/[0.04] hover:bg-white/[0.02]">
              <span className="relative mt-0.5 inline-flex">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="grid h-5 w-5 place-items-center rounded-md border border-white/15 bg-black/40 transition peer-checked:border-[color-mix(in_srgb,var(--signal)_50%,transparent)] peer-checked:bg-[var(--signal-dim)] peer-focus-visible:ring-2 peer-focus-visible:ring-[color-mix(in_srgb,var(--signal)_30%,transparent)]">
                  {remember ? <Check className="h-3 w-3 text-[var(--signal)]" strokeWidth={3} /> : null}
                </span>
              </span>
              <span className="text-[13px] leading-snug text-[var(--ink-muted)]">
                Remember keys in this browser
                <span className="mt-0.5 block text-[11px] text-[var(--ink-faint)]">Stored in localStorage only</span>
              </span>
            </label>
          </div>
        </section>

        {/* Render */}
        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-[color-mix(in_srgb,var(--signal)_25%,transparent)] bg-[var(--signal-dim)] text-[var(--signal)]">
              <Mic2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)]">Render defaults</h2>
              <p className="text-[11px] text-[var(--ink-faint)]">Models, preset, voice, and overlays</p>
            </div>
          </div>
          <div className="space-y-5 px-5 py-5">
            <label className="block">
              <span className="text-[12px] font-medium text-[var(--ink-muted)]">Default preset</span>
              <div className="relative mt-1.5">
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as SessionRenderPrefs["preset"])}
                  className={selectClass}
                  style={{ backgroundImage: selectChevron }}
                >
                  <option value="viral_30_45">Viral 30-45s</option>
                  <option value="ultra_25_35">Ultra 25-35s</option>
                  <option value="news_60_80">News 60-80s</option>
                  <option value="deep_explainer">Deep explainer</option>
                </select>
              </div>
            </label>

            <label className="block">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-[var(--ink-muted)]">Content model</span>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100">
                  Free
                </span>
              </div>
              <div className="relative mt-1.5">
                <select
                  value={contentModel}
                  onChange={(e) => setContentModel(resolveGeminiContentModel(e.target.value))}
                  className={selectClass}
                  style={{ backgroundImage: selectChevron }}
                >
                  {GEMINI_CONTENT_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--ink-faint)]">
                Used for planning scripts and scene content.
              </p>
            </label>

            <label className="block">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-[var(--ink-muted)]">Audio model (TTS)</span>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100">
                  Free
                </span>
              </div>
              <div className="relative mt-1.5">
                <select
                  value={audioModel}
                  onChange={(e) => setAudioModel(resolveGeminiAudioModel(e.target.value))}
                  className={selectClass}
                  style={{ backgroundImage: selectChevron }}
                >
                  {GEMINI_AUDIO_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--ink-faint)]">
                Used for Gemini speech generation / voiceover.
              </p>
            </label>

            <div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <label htmlFor="gemini-voice" className="text-[12px] font-medium text-[var(--ink-muted)]">
                  Voice (Gemini TTS)
                </label>
                <span className="rounded-full border border-[color-mix(in_srgb,var(--signal)_30%,transparent)] bg-[var(--signal-dim)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--signal)]">
                  {selectedVoice.style}
                </span>
              </div>
              <div className="relative mt-1.5">
                <select
                  id="gemini-voice"
                  value={voice}
                  onChange={(e) => setVoice(resolveGeminiTtsVoice(e.target.value))}
                  className={selectClass}
                  style={{ backgroundImage: selectChevron }}
                >
                  {GEMINI_TTS_VOICES.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} · {v.style}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-black/30 px-3.5 py-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--ink)]">{selectedVoice.name}</div>
                  <p className="mt-0.5 text-[12px] text-[var(--ink-faint)]">
                    {selectedVoice.style} tone · 30 official Gemini voices
                  </p>
                </div>
                <a
                  href="https://ai.google.dev/gemini-api/docs/speech-generation#languages"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-[var(--ink-muted)] transition hover:border-[color-mix(in_srgb,var(--signal)_35%,transparent)] hover:text-[var(--signal)]"
                >
                  Docs
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <ToggleCard
                checked={cutSfx}
                onChange={setCutSfx}
                title="Cut whoosh SFX"
                hint="Short transition sounds"
              />
              <ToggleCard
                checked={progress}
                onChange={setProgress}
                title="Progress bar"
                hint="Overlay on the video"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <PrimaryButton type="submit">{saved ? "Saved" : "Save settings"}</PrimaryButton>
          {saved ? (
            <Link
              href={returnTo}
              className="text-sm font-medium text-[var(--signal)] transition hover:text-[var(--signal)]"
            >
              Continue →
            </Link>
          ) : null}
        </div>
      </form>
    </WebShell>
  );
}

function ToggleCard({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition",
        checked
          ? "border-[color-mix(in_srgb,var(--signal)_35%,transparent)] bg-[var(--signal-dim)]"
          : "border-white/[0.07] bg-black/25 hover:border-white/[0.12]",
      )}
    >
      <span className="relative mt-0.5 inline-flex">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            "grid h-5 w-5 place-items-center rounded-md border transition",
            checked
              ? "border-[color-mix(in_srgb,var(--signal)_50%,transparent)] bg-[var(--signal-dim)] text-[var(--signal)]"
              : "border-white/15 bg-black/40 text-transparent",
          )}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      </span>
      <span>
        <span className="block text-[13px] font-medium text-[var(--ink)]">{title}</span>
        <span className="mt-0.5 block text-[11px] text-[var(--ink-faint)]">{hint}</span>
      </span>
    </label>
  );
}
