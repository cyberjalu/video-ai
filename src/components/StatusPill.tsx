import { cn } from "../lib/cn";
import type { GenerationStatus } from "../lib/types";

const LABELS: Record<GenerationStatus, string> = {
  idle: "Ready",
  reading_article: "Reading",
  capturing_screenshots: "Capturing",
  writing_script: "Writing",
  generating_voiceover: "Voiceover",
  rendering_video: "Rendering",
  finalizing_export: "Finalizing",
  extracting_audio: "Extracting Audio",
  transcribing: "Transcribing",
  transcript_ready: "Transcript Ready",
  merging_audio: "Merging Video",
  completed: "Completed",
  failed: "Failed",
};

export function StatusPill({
  status,
  className,
}: {
  status: GenerationStatus;
  className?: string;
}) {
  const variant =
    status === "completed"
      ? "completed"
      : status === "failed"
        ? "failed"
        : status === "idle"
          ? "idle"
          : "running";

  const containerStyles: Record<typeof variant, string> = {
    idle: "border-white/[0.07] bg-white/[0.035] text-zinc-400",
    running: "border-cyan-300/25 bg-cyan-300/10 text-cyan-200 shadow-[0_0_0_1px_rgba(99,214,243,0.08),0_8px_24px_rgba(61,170,200,0.12)]",
    completed: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    failed: "border-red-400/25 bg-red-400/10 text-red-200",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
        containerStyles[variant],
        className,
      )}
    >
      {/* Dot indicator */}
      <span className="relative flex h-1.5 w-1.5">
        {variant === "running" ? (
          <>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-300" />
          </>
        ) : (
          <span
            className={cn(
              "inline-flex h-1.5 w-1.5 rounded-full",
              variant === "completed"
                ? "bg-emerald-300"
                : variant === "failed"
                  ? "bg-red-300"
                  : "bg-zinc-400",
            )}
          />
        )}
      </span>
      {LABELS[status]}
    </div>
  );
}
