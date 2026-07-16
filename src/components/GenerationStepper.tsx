import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/cn";
import type { UiStep } from "../lib/generation";
import { Card } from "./Card";
import { SecondaryButton } from "./Buttons";

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
  onCancel,
}: {
  steps: UiStep[];
  progressPercent: number;
  elapsedMs: number;
  currentDescription?: string;
  onCancel?: () => void;
}) {
  return (
    <Card variant="strong" className="overflow-hidden p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow-label mb-2">Broadcast Pipeline</div>
          <div className="display-title text-[28px] leading-none text-zinc-100">Rendering in progress</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">Signal</div>
            <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
              <span>{formatElapsed(elapsedMs)}</span>
              <span className="font-bold text-zinc-200">{progressPercent}%</span>
            </div>
          </div>
          {onCancel ? (
            <SecondaryButton type="button" onClick={onCancel} className="text-xs">
              Cancel
            </SecondaryButton>
          ) : null}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5 rounded-[22px] border border-white/[0.06] bg-black/20 px-4 py-4">
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
          <span>Pipeline Status</span>
          <span>{steps.filter((step) => step.state === "completed").length}/{steps.length} phases locked</span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
          <motion.div
            className="relative h-full rounded-full bg-linear-to-r from-sky-400 via-cyan-300 to-emerald-300"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="pointer-events-none absolute inset-0 signal-sweep bg-linear-to-r from-transparent via-white/45 to-transparent" />
          </motion.div>
        </div>
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
            className="surface-inset mt-4 rounded-[20px] px-4 py-3 text-sm leading-6 text-zinc-300"
          >
            {currentDescription}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Steps */}
      <div className="mt-5 space-y-2">
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
                "relative flex items-center gap-3 overflow-hidden rounded-[20px] border px-4 py-3 transition-all duration-300",
                isRunning
                  ? "border-cyan-300/25 bg-[linear-gradient(180deg,rgba(99,214,243,0.12),rgba(255,255,255,0.03))] shadow-[0_12px_40px_rgba(24,105,132,0.16)]"
                  : isDone
                    ? "border-emerald-400/12 bg-emerald-400/5"
                    : isFailed
                      ? "border-red-400/15 bg-red-400/5"
                      : "border-white/[0.05] bg-black/20",
              )}
            >
              {isRunning && <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-cyan-300" />}
              {isRunning && (
                <div className="ambient-breathe pointer-events-none absolute right-[-3rem] top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-cyan-300/12 blur-2xl" />
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
                      "truncate text-sm font-semibold uppercase tracking-[0.08em] transition-colors",
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
                      "shrink-0 text-[10px] font-bold uppercase tracking-[0.18em]",
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
                  <div className="mt-1 truncate text-xs text-zinc-500">{s.detail}</div>
                ) : null}
              </div>

              {/* Running shimmer overlay */}
              {isRunning && (
                <div className="pointer-events-none absolute inset-0 rounded-[20px] shimmer" />
              )}
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
