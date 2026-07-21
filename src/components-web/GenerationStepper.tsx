"use client";

import { useRef } from "react";
import { CheckCircle2, Circle, Images, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { UiStep } from "@/lib/domain/generation";
import { gsap, useGSAP, withMotionPreference } from "@/lib/gsap-client";
import { Card } from "./Card";
import { PrimaryButton, SecondaryButton } from "./Buttons";

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
  awaitingAssets = false,
  onContinueRender,
  onContinueFailed,
  hasPexelsKey = false,
  isBusy = false,
  isFailed = false,
  continueBusy = false,
  hasPlan = false,
}: {
  steps: UiStep[];
  progressPercent: number;
  elapsedMs: number;
  currentDescription?: string;
  onCancel?: () => void;
  awaitingAssets?: boolean;
  onContinueRender?: () => void;
  onContinueFailed?: () => void;
  hasPexelsKey?: boolean;
  isBusy?: boolean;
  isFailed?: boolean;
  continueBusy?: boolean;
  hasPlan?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const entered = useRef(false);

  const title = awaitingAssets
    ? "Your turn — script & visuals"
    : isFailed
      ? "Pipeline stopped"
      : "Rendering in progress";

  useGSAP(
    () =>
      withMotionPreference(() => {
        if (entered.current) return;
        entered.current = true;
        gsap.from(".gsap-step-row", {
          x: -8,
          opacity: 0,
          duration: 0.35,
          stagger: 0.04,
          ease: "power2.out",
          clearProps: "opacity,transform",
        });
      }),
    { scope: root },
  );

  useGSAP(
    () => {
      if (!barRef.current) return;
      const el = barRef.current;
      const width = `${Math.min(100, Math.max(0, progressPercent))}%`;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(el, { width });
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(el, {
          width,
          duration: 0.4,
          ease: "power2.out",
          overwrite: "auto",
        });
      });
      return () => mm.revert();
    },
    { dependencies: [progressPercent], scope: root },
  );

  useGSAP(
    () => {
      if (!descRef.current || !currentDescription) return;
      const el = descRef.current;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(el, { autoAlpha: 1, y: 0 });
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 6 },
          { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out" },
        );
      });
      return () => mm.revert();
    },
    { dependencies: [currentDescription], scope: root },
  );

  return (
    <Card variant="strong" className="overflow-hidden p-6">
      <div ref={root}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="eyebrow-label mb-2">Broadcast Pipeline</div>
            <div className="display-title text-[28px] leading-none text-[var(--ink)]">{title}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="rounded-2xl border border-[var(--line-soft)] bg-white/[0.03] px-3 py-2 text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-faint)]">
                Signal
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-[var(--ink-muted)]">
                <span>{formatElapsed(elapsedMs)}</span>
                <span className="font-bold tabular-nums text-[var(--ink)]">{progressPercent}%</span>
              </div>
            </div>
            {onCancel ? (
              <SecondaryButton type="button" onClick={onCancel} className="text-xs">
                Cancel
              </SecondaryButton>
            ) : null}
          </div>
        </div>

        <div className="mt-5 rounded-[22px] border border-[var(--line-soft)] bg-black/20 px-4 py-4">
          <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--ink-faint)]">
            <span>Pipeline Status</span>
            <span>
              {steps.filter((step) => step.state === "completed").length}/{steps.length} phases locked
              {isBusy ? " · live" : ""}
            </span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
            <div
              ref={barRef}
              className="relative h-full w-0 rounded-full bg-gradient-to-r from-teal-500 via-[var(--signal)] to-emerald-300"
            >
              {isBusy ? (
                <div className="pointer-events-none absolute inset-0 signal-sweep bg-gradient-to-r from-transparent via-white/45 to-transparent" />
              ) : null}
            </div>
          </div>
        </div>

        {currentDescription ? (
          <div
            ref={descRef}
            key={currentDescription}
            className="surface-inset mt-4 rounded-[20px] px-4 py-3 text-sm leading-6 text-[var(--ink-muted)]"
          >
            {isBusy ? (
              <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--signal)] align-middle" />
            ) : null}
            {currentDescription}
          </div>
        ) : null}

        {awaitingAssets && onContinueRender ? (
          <div className="mt-4 rounded-[20px] border border-[color-mix(in_srgb,var(--signal)_30%,transparent)] bg-[var(--signal-dim)] px-4 py-4">
            <div className="text-sm font-semibold text-[var(--ink)]">
              Plan is ready — edit script &amp; visuals
            </div>
            <div className="mt-1 text-sm text-[var(--ink-muted)]">
              Tweak voiceover per scene, add or remove scenes, then attach image/video. Empty scenes
              {hasPexelsKey
                ? " auto-fill from Pexels when you continue."
                : " need a Pexels key in Settings (or upload files)."}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryButton type="button" onClick={onContinueRender}>
                Continue render
              </PrimaryButton>
              <SecondaryButton type="button" onClick={onContinueRender}>
                Skip &amp; render
              </SecondaryButton>
            </div>
          </div>
        ) : null}

        {isFailed && onContinueFailed ? (
          <div className="mt-4 rounded-[20px] border border-[color-mix(in_srgb,var(--tally)_35%,transparent)] bg-[var(--tally-dim)] px-4 py-4">
            <div className="text-sm font-semibold text-[var(--ink)]">
              {hasPlan ? "Resume render" : "Resume planning"}
            </div>
            <div className="mt-1 text-sm text-[var(--ink-muted)]">
              Job was cancelled or hit a rate limit. Progress updates live once you continue
              {hasPlan ? " — your plan is kept." : " — planning restarts from the start."}
            </div>
            <div className="mt-4">
              <PrimaryButton
                type="button"
                onClick={onContinueFailed}
                disabled={continueBusy}
                isLoading={continueBusy}
              >
                {continueBusy ? "Resuming…" : "Continue"}
              </PrimaryButton>
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-2">
          {steps.map((s) => {
            const isAwaitingStep = awaitingAssets && s.id === "awaiting_assets" && s.state === "running";
            const isRunning = s.state === "running" && !isAwaitingStep;
            const isDone = s.state === "completed";
            const isFailedStep = s.state === "failed";

            return (
              <div
                key={s.id}
                className={cn(
                  "gsap-step-row relative flex items-center gap-3 overflow-hidden rounded-[20px] border px-4 py-3 transition-all duration-300",
                  isAwaitingStep
                    ? "border-[color-mix(in_srgb,var(--tally)_35%,transparent)] bg-[linear-gradient(180deg,var(--tally-dim),rgba(255,255,255,0.03))]"
                    : isRunning
                      ? "border-[color-mix(in_srgb,var(--signal)_30%,transparent)] bg-[linear-gradient(180deg,var(--signal-dim),rgba(255,255,255,0.03))] shadow-[0_12px_40px_rgba(94,234,212,0.12)]"
                      : isDone
                        ? "border-emerald-400/12 bg-emerald-400/5"
                        : isFailedStep
                          ? "border-red-400/15 bg-red-400/5"
                          : "border-[var(--line-soft)] bg-black/20",
                )}
              >
                {isRunning && (
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[var(--signal)]" />
                )}
                {isAwaitingStep && (
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-[var(--tally)]" />
                )}
                {isRunning && (
                  <div className="ambient-breathe pointer-events-none absolute right-[-3rem] top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-[var(--signal)]/12 blur-2xl" />
                )}
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : isFailedStep ? (
                    <XCircle className="h-4 w-4 text-red-400" />
                  ) : isAwaitingStep ? (
                    <Images className="h-4 w-4 text-[var(--tally)]" />
                  ) : isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--signal)]" />
                  ) : (
                    <Circle className="h-4 w-4 text-white/15" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={cn(
                        "truncate text-sm font-semibold uppercase tracking-[0.08em] transition-colors",
                        isAwaitingStep || isRunning
                          ? "text-[var(--ink)]"
                          : isDone
                            ? "text-[var(--ink-muted)]"
                            : isFailedStep
                              ? "text-[var(--ink)]"
                              : "text-[var(--ink-faint)]",
                      )}
                    >
                      {s.label}
                    </div>
                    <div
                      className={cn(
                        "shrink-0 text-[10px] font-bold uppercase tracking-[0.18em]",
                        isDone
                          ? "text-emerald-400"
                          : isFailedStep
                            ? "text-red-400"
                            : isAwaitingStep
                              ? "text-[var(--tally)]"
                              : isRunning
                                ? "text-[var(--signal)]"
                                : "text-[var(--ink-faint)]",
                      )}
                    >
                      {isDone
                        ? "Done"
                        : isFailedStep
                          ? "Failed"
                          : isAwaitingStep
                            ? "Your turn"
                            : isRunning
                              ? "Running"
                              : "Pending"}
                    </div>
                  </div>
                  {s.detail ? (
                    <div className="mt-1 truncate text-xs text-[var(--ink-faint)]">{s.detail}</div>
                  ) : null}
                </div>

                {isRunning && (
                  <div className="pointer-events-none absolute inset-0 rounded-[20px] shimmer" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
