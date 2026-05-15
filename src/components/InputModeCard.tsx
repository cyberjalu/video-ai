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
    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#101014] shadow-sm">
      {/* Subtle grid texture for visual interest */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.15] [mask-image:radial-gradient(400px_circle_at_50%_0%,black,transparent_60%)] bg-hero-grid bg-grid-40" />

      {/* Top border glow indicator */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

      <div className="relative p-6">
        {/* Header & Tabs */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="mb-1 text-lg md:text-xl font-bold tracking-tight text-zinc-100">
              Create a TikTok video
            </div>
            <div className="text-sm text-zinc-400">
              {inputMode === "url" 
                ? "Paste a news article URL — ClipNews AI handles the rest."
                : "Describe your idea — AI will write the script and generate a typography video."}
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-black/40 p-1 border border-white/5 shadow-inner">
            <button
              onClick={() => onChangeMode("url")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                inputMode === "url"
                  ? "bg-zinc-800 text-white shadow-sm ring-1 ring-white/10"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Link2 className="h-4 w-4" />
              From Article URL
            </button>
            <button
              onClick={() => onChangeMode("prompt")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                inputMode === "prompt"
                  ? "bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-white shadow-sm ring-1 ring-white/10"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Sparkles className="h-4 w-4" />
              From Text Prompt
            </button>
          </div>
        </div>

        {/* Input row */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* URL field */}
          {inputMode === "url" ? (
            <label className="flex-1 block">
              <span className="sr-only">Article URL</span>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg border bg-[#09090b] px-5 py-4 transition-all",
                  error
                    ? "border-red-400/40 ring-2 ring-red-400/10"
                    : disabled
                      ? "border-white/[0.06] opacity-60"
                      : "border-white/10 ring-1 ring-transparent focus-within:border-violet-400/40 focus-within:ring-violet-400/15",
                )}
              >
                <Link2
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    error ? "text-red-400" : "text-zinc-500",
                  )}
                />
                <input
                  id="article-url-input"
                  value={url}
                  onChange={(e) => onChangeUrl(e.currentTarget.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="https://techcrunch.com/2026/..."
                  disabled={disabled}
                  className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-describedby={error ? "url-error" : undefined}
                />
                {isLoading && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-300" />
                )}
              </div>
            </label>
          ) : (
            <label className="flex-1 block">
              <span className="sr-only">Text Prompt</span>
              <div
                className={cn(
                  "flex items-start gap-3 rounded-lg border bg-[#09090b] px-5 py-4 transition-all",
                  error
                    ? "border-red-400/40 ring-2 ring-red-400/10"
                    : disabled
                      ? "border-white/[0.06] opacity-60"
                      : "border-white/10 ring-1 ring-transparent focus-within:border-cyan-400/40 focus-within:ring-cyan-400/15",
                )}
              >
                <FileText
                  className={cn(
                    "h-4 w-4 shrink-0 mt-0.5 transition-colors",
                    error ? "text-red-400" : "text-zinc-500",
                  )}
                />
                <textarea
                  id="prompt-input"
                  value={promptText}
                  onChange={(e) => onChangePrompt(e.currentTarget.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Làm một video giải thích tại sao mật khẩu 123456 lại nguy hiểm, lấy ví dụ vụ hack gần đây..."
                  disabled={disabled}
                  rows={3}
                  className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none resize-none"
                  spellCheck={false}
                  aria-describedby={error ? "url-error" : undefined}
                />
                {isLoading && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-300 mt-0.5" />
                )}
              </div>
            </label>
          )}

          {/* Buttons */}
          <div className="flex shrink-0 gap-2">
            <PrimaryButton
              id="create-video-btn"
              onClick={onCreate}
              disabled={disabled}
              isLoading={isLoading}
              className={cn(
                "whitespace-nowrap px-5",
                inputMode === "url" ? "h-[52px]" : "h-[52px] lg:h-[84px]"
              )}
            >
              {isLoading ? "Generating…" : "Create Video"}
            </PrimaryButton>

            <SecondaryButton
              onClick={onPasteFromClipboard}
              disabled={disabled}
              className={cn(
                "shrink-0 px-4",
                inputMode === "url" ? "h-[52px]" : "h-[52px] lg:h-[84px]"
              )}
              aria-label="Paste from clipboard"
              title="Paste from clipboard"
            >
              <Clipboard className="h-4 w-4" />
              <span className="hidden md:inline">Paste</span>
            </SecondaryButton>
          </div>
        </div>

        {/* Error message */}
        {error ? (
          <div id="url-error" className="mt-3 flex items-center gap-2 text-sm font-semibold text-red-300">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
            {error}
          </div>
        ) : null}

        {/* Helper text */}
        {!error && (
          <div className="mt-3 text-xs text-zinc-600">
            {inputMode === "url" 
              ? "Works best with news articles, blog posts, and press releases. Paywalled sites may not work."
              : "Tip: Press Cmd+Enter to create. Describe your idea in Vietnamese for best results."}
          </div>
        )}
      </div>
    </div>
  );
}
