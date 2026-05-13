import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/cn";
import type { UiStep } from "../lib/generation";
import { Card } from "./Card";

function formatElapsed(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

export function GenerationStepper({
  steps,
  progressPercent,
  elapsedMs,
  currentDescription,
}: {
  steps: UiStep[];
  progressPercent: number;
  elapsedMs: number;
  currentDescription?: string;
}) {


  return (
    <Card className="overflow-hidden p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-zinc-100">Generating your video</div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>{formatElapsed(elapsedMs)}</span>
          <span className="font-bold text-zinc-300">{progressPercent}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="relative h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400"
          initial={{ width: "0%" }}
          animate={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Animated sweeping highlight */}
          <div className="absolute inset-0 w-[200%] animate-[shimmer_2s_linear_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </motion.div>
      </div>

      {/* Current step description */}
      <AnimatePresence mode="wait">
        {currentDescription ? (
          <motion.div
            key={currentDescription}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-3 text-sm text-zinc-300"
          >
            {currentDescription}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Steps */}
      <div className="mt-5 space-y-1.5">
        {steps.map((s, index) => {
          const isRunning = s.state === "running";
          const isDone = s.state === "completed";
          const isFailed = s.state === "failed";

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              className={cn(
                "relative flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300",
                isRunning
                  ? "border-cyan-400/40 bg-cyan-400/10 shadow-[0_0_12px_rgba(34,211,238,0.3)] ring-1 ring-cyan-400/20"
                  : isDone
                    ? "border-emerald-400/12 bg-emerald-400/5"
                    : isFailed
                      ? "border-red-400/15 bg-red-400/5"
                      : "border-white/[0.05] bg-black/20",
              )}
            >
              {/* Active neon pulse indicator behind the card */}
              {isRunning && (
                <div className="absolute -inset-1 -z-10 animate-pulse rounded-[14px] bg-cyan-400/20 blur-sm" />
              )}
              {/* Step icon */}
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : isFailed ? (
                  <XCircle className="h-4 w-4 text-red-400" />
                ) : isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                ) : (
                  <Circle className="h-4 w-4 text-white/15" />
                )}
              </div>

              {/* Label + detail */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={cn(
                      "truncate text-sm font-semibold transition-colors",
                      isRunning
                        ? "text-zinc-100"
                        : isDone
                          ? "text-zinc-300"
                          : isFailed
                            ? "text-zinc-200"
                            : "text-zinc-600",
                    )}
                  >
                    {s.label}
                  </div>
                  <div
                    className={cn(
                      "shrink-0 text-[11px] font-bold tracking-wide",
                      isDone
                        ? "text-emerald-400"
                        : isFailed
                          ? "text-red-400"
                          : isRunning
                            ? "text-cyan-300"
                            : "text-zinc-700",
                    )}
                  >
                    {isDone ? "Done" : isFailed ? "Failed" : isRunning ? "Running" : "Pending"}
                  </div>
                </div>
                {s.detail ? (
                  <div className="mt-0.5 truncate text-xs text-zinc-500">{s.detail}</div>
                ) : null}
              </div>

              {/* Running shimmer overlay */}
              {isRunning && (
                <div className="pointer-events-none absolute inset-0 rounded-xl shimmer" />
              )}
            </motion.div>
          );
        })}
      </div>

    </Card>
  );
}
