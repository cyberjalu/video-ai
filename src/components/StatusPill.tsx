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
    idle: "border-white/10 bg-white/5 text-zinc-400",
    running: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300",
    completed: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
    failed: "border-red-400/25 bg-red-400/10 text-red-300",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide",
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
