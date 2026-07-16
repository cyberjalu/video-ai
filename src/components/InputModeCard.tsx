import type React from "react";
import { Clipboard, Link2, Loader2, Sparkles, FileText } from "lucide-react";
import { cn } from "../lib/cn";
import { PrimaryButton, SecondaryButton } from "./Buttons";

export type InputMode = "url" | "prompt";

export function InputModeCard({
  inputMode,
  onChangeMode,
  url,
  onChangeUrl,
  promptText,
  onChangePrompt,
  onPasteFromClipboard,
  onCreate,
  disabled,
  isLoading,
  error,
}: {
  inputMode: InputMode;
  onChangeMode: (mode: InputMode) => void;
  url: string;
  onChangeUrl: (v: string) => void;
  promptText: string;
  onChangePrompt: (v: string) => void;
  onPasteFromClipboard: () => void;
  onCreate: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  error?: string | null;
}) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey || inputMode === "url") && !disabled) {
      e.preventDefault();
      onCreate();
    }
  }

  return (
    <div className="surface-panel relative overflow-hidden rounded-[24px] shadow-card">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] mask-[radial-gradient(560px_circle_at_50%_0%,black,transparent_70%)] bg-hero-grid bg-grid-40" />

      {/* Top glow line */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-400/40 to-transparent" />

      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-28 w-[28rem] rounded-full bg-cyan-500/6 blur-3xl" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[22rem] bg-linear-to-l from-cyan-300/[0.05] to-transparent" />

      <div className="relative px-6 py-6">
        {/* Mode tabs row */}
        <div className="mb-6 flex items-start justify-between gap-4">
          {/* Label */}
          <div>
            <div className="eyebrow-label mb-2">Create Video</div>
            <div className="text-[22px] font-semibold leading-tight text-zinc-100">
              Turn a source into a publishable short.
            </div>
          
          </div>

          {/* Mode switcher */}
          <div className="surface-inset flex items-center gap-1 rounded-2xl p-1">
            <button
              type="button"
              onClick={() => onChangeMode("url")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-200",
                inputMode === "url"
                  ? "bg-zinc-700 text-white shadow-sm ring-1 ring-white/10"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5",
              )}
            >
              <Link2 className="h-3.5 w-3.5" />
              Article URL
            </button>
            <button
              type="button"
              onClick={() => onChangeMode("prompt")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-200",
                inputMode === "prompt"
                  ? "bg-[linear-gradient(90deg,rgba(122,190,255,0.18),rgba(99,214,243,0.18))] text-white shadow-sm ring-1 ring-cyan-300/20"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Text Prompt
            </button>
          </div>
        </div>

        {/* Input row */}
        <div className="flex flex-row items-start gap-3">
          {inputMode === "url" ? (
            <label className="flex-1 block">
              <span className="sr-only">Article URL</span>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-[18px] border bg-[rgba(6,7,10,0.72)] px-4 py-3.5 transition-all duration-200",
                  error
                    ? "border-red-400/40 ring-1 ring-red-400/10"
                    : disabled
                      ? "border-white/[0.05] opacity-60"
                      : "border-white/[0.09] focus-within:border-cyan-400/40 focus-within:ring-1 focus-within:ring-cyan-400/10 focus-within:shadow-[0_0_20px_rgba(34,211,238,0.06)]",
                )}
              >
                <Link2
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    error ? "text-red-400" : "text-zinc-600",
                  )}
                />
                <input
                  id="article-url-input"
                  value={url}
                  onChange={(e) => onChangeUrl(e.currentTarget.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="https://techcrunch.com/2026/..."
                  disabled={disabled}
                  className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-700 focus:outline-none"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-describedby={error ? "url-error" : undefined}
                />
                {isLoading && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-400" />
                )}
              </div>
            </label>
          ) : (
            <label className="flex-1 block">
              <span className="sr-only">Text Prompt</span>
              <div
                className={cn(
                  "flex items-start gap-3 rounded-[18px] border bg-[rgba(6,7,10,0.72)] px-4 py-3.5 transition-all duration-200",
                  error
                    ? "border-red-400/40 ring-1 ring-red-400/10"
                    : disabled
                      ? "border-white/[0.05] opacity-60"
                      : "border-white/[0.09] focus-within:border-cyan-400/40 focus-within:ring-1 focus-within:ring-cyan-400/10 focus-within:shadow-[0_0_20px_rgba(34,211,238,0.06)]",
                )}
              >
                <FileText
                  className={cn(
                    "h-4 w-4 shrink-0 mt-0.5 transition-colors",
                    error ? "text-red-400" : "text-zinc-600",
                  )}
                />
                <textarea
                  id="prompt-input"
                  value={promptText}
                  onChange={(e) => onChangePrompt(e.currentTarget.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Làm video giải thích tại sao mật khẩu 123456 lại nguy hiểm..."
                  disabled={disabled}
                  rows={3}
                  className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-700 focus:outline-none resize-none"
                  spellCheck={false}
                  aria-describedby={error ? "url-error" : undefined}
                />
                {isLoading && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-400 mt-0.5" />
                )}
              </div>
            </label>
          )}

          {/* Action buttons */}
          <div className="flex shrink-0 gap-2">
            <PrimaryButton
              id="create-video-btn"
              onClick={onCreate}
              disabled={disabled}
              isLoading={isLoading}
              className={cn(
                "whitespace-nowrap px-6",
                inputMode === "url" ? "h-[48px]" : "h-[82px]",
              )}
            >
              {isLoading ? "Generating…" : "Create Video"}
            </PrimaryButton>

            <SecondaryButton
              onClick={onPasteFromClipboard}
              disabled={disabled}
              className={cn(
                "shrink-0 px-3.5",
                inputMode === "url" ? "h-[48px]" : "h-[82px]",
              )}
              aria-label="Paste from clipboard"
              title="Paste from clipboard"
            >
              <Clipboard className="h-4 w-4" />
              <span className="text-xs">Paste</span>
            </SecondaryButton>
          </div>
        </div>

        {/* Error message */}
        {error ? (
          <div id="url-error" className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-red-300">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
            {error}
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-600">
            <div>
              {inputMode === "url"
                ? "Works best with news articles, blog posts, and press releases."
                : "Press Cmd+Enter to create · Describe your idea in detail for best results."}
            </div>
            <div className="hidden md:block uppercase tracking-[0.16em] text-zinc-700">Fast ingest · clean output</div>
          </div>
        )}
      </div>
    </div>
  );
}
