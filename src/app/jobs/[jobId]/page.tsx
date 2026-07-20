"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GenerationStepper } from "@/components/GenerationStepper";
import { ScenePlanPanel } from "@/components/ScenePlanPanel";
import { PrimaryButton } from "@/components/Buttons";
import { WebShell } from "@/components/WebShell";
import { startRender } from "@/lib/api-client";
import { loadSessionGeminiKey } from "@/lib/session-keys";
import { useJob } from "@/lib/hooks/useJob";
import type { VideoPlan } from "@/lib/domain/types";

export default function JobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = String(params?.jobId ?? "");
  const { steps, status, plan, logs, error, mp4Url, elapsedMs, progressPercent, setPlan } = useJob(jobId);
  const [renderBusy, setRenderBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const awaitingReview = status === "awaiting_assets";
  const isBusy =
    status !== "awaiting_assets" && status !== "completed" && status !== "failed";

  useEffect(() => {
    if (mp4Url && status === "completed") {
      router.push(`/jobs/${jobId}/result`);
    }
  }, [mp4Url, status, jobId, router]);

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

  function onPlanChange(next: VideoPlan) {
    setPlan(next);
  }

  return (
    <WebShell
      header={
        <div>
          <Link href="/templates" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Templates
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Job {jobId.slice(0, 8)}…</h1>
        </div>
      }
    >
      <GenerationStepper
        steps={steps}
        progressPercent={progressPercent}
        elapsedMs={elapsedMs}
        awaitingAssets={awaitingReview}
      />

      {awaitingReview ? (
        <div className="mt-6 space-y-4">
          <ScenePlanPanel plan={plan} editable jobId={jobId} onPlanChange={onPlanChange} />
          <div className="flex flex-wrap gap-3">
            <PrimaryButton type="button" disabled={renderBusy} onClick={() => void onContinueRender()}>
              {renderBusy ? "Starting render…" : "Continue to render"}
            </PrimaryButton>
            <Link
              href={`/jobs/${jobId}/result`}
              className="inline-flex items-center rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-300"
            >
              View result
            </Link>
          </div>
        </div>
      ) : plan ? (
        <ScenePlanPanel plan={plan} editable={false} jobId={jobId} />
      ) : null}

      {isBusy && !awaitingReview ? <p className="mt-4 text-sm text-zinc-400">Pipeline running…</p> : null}

      {error || actionError ? (
        <p className="mt-4 text-sm text-red-300">{error ?? actionError}</p>
      ) : null}

      {logs.length ? (
        <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-black/40 p-3 text-xs text-zinc-500">
          {logs.slice(-20).join("\n")}
        </pre>
      ) : null}
    </WebShell>
  );
}
