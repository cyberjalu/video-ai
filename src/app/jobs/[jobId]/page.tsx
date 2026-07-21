"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GenerationStepper } from "@/components/GenerationStepper";
import { ScenePlanPanel } from "@/components/ScenePlanPanel";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { Badge } from "@/components/Badge";
import { WebShell } from "@/components/WebShell";
import { cancelJob, continueJob, startRender } from "@/lib/api-client";
import { loadSessionGeminiKey, loadSessionPexelsKey } from "@/lib/session-keys";
import { useJob } from "@/lib/hooks/useJob";
import { friendlyErrorMessage } from "@/lib/domain/generation";
import type { VideoPlan } from "@/lib/domain/types";

export default function JobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = String(params?.jobId ?? "");
  const {
    steps,
    status,
    plan,
    logs,
    error,
    mp4Url,
    craftReport,
    elapsedMs,
    progressPercent,
    liveMessage,
    setPlan,
    prepareContinue,
    markFailedLocal,
  } = useJob(jobId);
  const [renderBusy, setRenderBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [hasPexels, setHasPexels] = useState(false);

  const awaitingReview = status === "awaiting_assets";
  const isFailed = status === "failed";
  const isBusy =
    status !== "awaiting_assets" && status !== "completed" && status !== "failed";

  useEffect(() => {
    setHasPexels(Boolean(loadSessionPexelsKey()));
  }, []);

  useEffect(() => {
    if (isFailed) setLogsOpen(true);
  }, [isFailed]);

  useEffect(() => {
    if (mp4Url && status === "completed") {
      router.push(`/jobs/${jobId}/result`);
    }
  }, [mp4Url, status, jobId, router]);

  const currentDescription = useMemo(() => {
    if (awaitingReview) {
      return "Plan locked in — edit captions & assets, then continue to render on this machine.";
    }
    if (isFailed) {
      return friendlyErrorMessage(error ?? "Pipeline stopped.");
    }
    const running = steps.find((s) => s.state === "running");
    if (liveMessage) return liveMessage;
    if (running?.detail) return running.detail;
    if (running) return `${running.label}…`;
    if (isBusy) return "Broadcast pipeline is running locally…";
    return undefined;
  }, [awaitingReview, steps, status, isBusy, isFailed, error, liveMessage]);

  async function onContinueRender() {
    setActionError(null);
    if (!loadSessionGeminiKey()) {
      router.push(`/settings?return=/jobs/${jobId}`);
      return;
    }
    setRenderBusy(true);
    try {
      await startRender(jobId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setRenderBusy(false);
    }
  }

  async function onContinueFailed() {
    setActionError(null);
    if (!loadSessionGeminiKey()) {
      router.push(`/settings?return=/jobs/${jobId}`);
      return;
    }
    const hasPlan = Boolean(plan);
    prepareContinue(hasPlan);
    setRenderBusy(true);
    try {
      await continueJob(jobId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setActionError(msg);
      markFailedLocal(msg);
    } finally {
      setRenderBusy(false);
    }
  }

  async function onCancel() {
    try {
      await cancelJob(jobId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  function onPlanChange(next: VideoPlan) {
    setPlan(next);
  }

  return (
    <WebShell
      header={
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/templates" className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink)]">
              ← Templates
            </Link>
            <h1 className="display-title mt-2 text-2xl text-[var(--ink)]">
              {plan?.title?.trim() || "Local render job"}
            </h1>
            <p className="mt-1 font-mono text-[11px] text-[var(--ink-faint)]">{jobId}</p>
          </div>
          {craftReport ? (
            <Badge variant={craftReport.pass ? "success" : "accent"}>
              Craft {craftReport.pass ? "pass" : "review"} · {craftReport.score}
            </Badge>
          ) : null}
        </div>
      }
    >
      <GenerationStepper
        steps={steps}
        progressPercent={progressPercent}
        elapsedMs={elapsedMs}
        currentDescription={currentDescription}
        awaitingAssets={awaitingReview}
        isBusy={isBusy}
        isFailed={isFailed}
        continueBusy={renderBusy}
        onContinueRender={awaitingReview ? () => void onContinueRender() : undefined}
        onContinueFailed={isFailed ? () => void onContinueFailed() : undefined}
        onCancel={isBusy ? () => void onCancel() : undefined}
        hasPexelsKey={hasPexels}
        hasPlan={Boolean(plan)}
      />

      <AnimatePresence mode="wait">
        {awaitingReview ? (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="mt-6 space-y-4"
          >
            {craftReport && !craftReport.pass ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                <div className="font-medium">Craft needs work · {craftReport.score}/100</div>
                {craftReport.reasons.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-100/90">
                    {craftReport.reasons.slice(0, 5).map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-2 text-xs text-amber-100/80">
                  Soft guide only — you can still edit and render.
                </p>
              </div>
            ) : null}
            <ScenePlanPanel plan={plan} editable jobId={jobId} onPlanChange={onPlanChange} />
            <div className="flex flex-wrap gap-3">
              <PrimaryButton
                type="button"
                disabled={renderBusy}
                isLoading={renderBusy}
                onClick={() => void onContinueRender()}
              >
                {renderBusy ? "Starting render…" : "Continue to render"}
              </PrimaryButton>
              <Link href={`/jobs/${jobId}/result`}>
                <SecondaryButton type="button">View result</SecondaryButton>
              </Link>
            </div>
          </motion.div>
        ) : plan && !isBusy ? (
          <motion.div
            key="plan-ro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6"
          >
            <ScenePlanPanel plan={plan} editable={false} jobId={jobId} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error || actionError ? (
        <p className="mt-4 text-sm text-red-300">
          {friendlyErrorMessage(actionError ?? error ?? "")}
        </p>
      ) : null}

      {logs.length ? (
        <div className="surface-panel mt-6 overflow-hidden rounded-2xl">
          <button
            type="button"
            onClick={() => setLogsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-faint)] transition hover:bg-white/[0.03]"
          >
            <span>Pipeline log</span>
            <span className="text-[var(--ink-faint)]">
              {logsOpen ? "Hide" : "Show"} · {logs.length}
              {liveMessage && isBusy ? " · live" : ""}
            </span>
          </button>
          {logsOpen ? (
            <pre className="max-h-48 overflow-auto border-t border-white/[0.06] bg-black/35 p-3 text-[11px] leading-relaxed text-[var(--ink-faint)]">
              {logs.slice(-40).join("\n")}
            </pre>
          ) : null}
        </div>
      ) : null}
    </WebShell>
  );
}
