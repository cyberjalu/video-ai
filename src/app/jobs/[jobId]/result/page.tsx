"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { VideoPreviewCard } from "@/components/VideoPreviewCard";
import { WebShell } from "@/components/WebShell";
import { SecondaryButton } from "@/components/Buttons";
import { downloadUrl, getJob, startRender } from "@/lib/api-client";
import { buildCaptionText } from "@/lib/job-utils";
import { loadSessionGeminiKey } from "@/lib/session-keys";
import type { VideoPlan } from "@/lib/domain/types";

type CaptionPack = {
  title: string;
  description: string;
  hashtags: string[];
  postingTimeHint: string;
  fullCaption: string;
};

export default function JobResultPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = String(params?.jobId ?? "");
  const [plan, setPlan] = useState<VideoPlan | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [captionPack, setCaptionPack] = useState<CaptionPack | null>(null);
  const [qc, setQc] = useState<{ pass: boolean; score: number; reasons: string[] } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    void getJob(jobId).then((j) => {
      if (j.plan) setPlan(j.plan);
      setExpiresAt(j.expiresAt);
      setStatus(j.status);
      if (j.captionPack) setCaptionPack(j.captionPack);
      if (j.qc) setQc(j.qc);
    });
  }, [jobId]);

  const mp4Url = status === "completed" ? downloadUrl(jobId) : null;
  const captionText = captionPack?.fullCaption ?? (plan ? buildCaptionText(plan) : null);

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function onRerender() {
    if (!loadSessionGeminiKey()) {
      router.push(`/settings?return=/jobs/${jobId}/result`);
      return;
    }
    await startRender(jobId);
    router.push(`/jobs/${jobId}`);
  }

  return (
    <WebShell
      header={
        <div>
          <Link href={`/jobs/${jobId}`} className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink)]">
            ← Job progress
          </Link>
          <h1 className="display-title mt-2 text-2xl text-[var(--ink)]">Your video</h1>
          {expiresAt ? (
            <p className="mt-1 text-xs text-[var(--ink-faint)]">
              Available until {new Date(expiresAt).toLocaleString()} — download on this machine.
            </p>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <VideoPreviewCard
          title={plan?.title}
          durationSec={plan?.target_duration_sec}
          sceneCount={plan?.scenes.length}
          mp4Url={mp4Url}
          captionText={captionText}
          onCreateAnother={() => router.push("/templates")}
          onCopyCaption={() => captionText && void copy(captionText, "caption")}
          onRerender={status === "completed" ? () => void onRerender() : undefined}
        />

        <aside className="space-y-4">
          {qc ? (
            <div className="surface-panel rounded-2xl p-4 text-sm">
              <div className="font-semibold text-[var(--ink)]">
                Viral QC: {qc.pass ? "pass" : "warn"} ({qc.score})
              </div>
              {qc.reasons.length ? (
                <ul className="mt-2 list-disc pl-4 text-xs text-[var(--ink-muted)]">
                  {qc.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-[var(--ink-faint)]">Retention structure looks good.</p>
              )}
            </div>
          ) : null}

          {captionPack ? (
            <div className="surface-panel space-y-3 rounded-2xl p-4 text-sm">
              <div className="font-semibold text-[var(--ink)]">Caption pack</div>
              <p className="text-xs text-[var(--ink-muted)]">{captionPack.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {captionPack.hashtags.map((h) => (
                  <span
                    key={h}
                    className="rounded-full border border-[color-mix(in_srgb,var(--signal)_25%,transparent)] bg-[var(--signal-dim)] px-2 py-0.5 text-[11px] text-[var(--signal)]"
                  >
                    {h}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-[var(--ink-faint)]">Best time: {captionPack.postingTimeHint}</p>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton
                  type="button"
                  onClick={() => void copy(captionPack.hashtags.join(" "), "hashtags")}
                  className="px-3 py-1.5 text-xs"
                >
                  Copy hashtags
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => void copy(captionPack.fullCaption, "full")}
                  className="px-3 py-1.5 text-xs"
                >
                  Copy full caption
                </SecondaryButton>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton type="button" onClick={() => void copy(window.location.href, "link")}>
              Copy share link
            </SecondaryButton>
            <Link
              href={`/tiktok?jobId=${jobId}`}
              className="relative inline-flex items-center justify-center overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--signal)_25%,transparent)] bg-linear-[180deg,#7ce3f8_0%,#48c8ec_52%,#2f9ec5_100%] px-4 py-3 text-sm font-bold text-slate-950 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_12px_30px_rgba(44,167,203,0.28)] transition-all duration-200 hover:-translate-y-px active:scale-[0.985]"
            >
              <span className="pointer-events-none absolute inset-0 signal-sweep bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.08)_45%,rgba(255,255,255,0.36)_50%,rgba(255,255,255,0.06)_56%,transparent_100%)]" />
              <span className="relative">Publish to TikTok</span>
            </Link>
            {copied ? <span className="text-xs text-[var(--signal)]">Copied {copied}!</span> : null}
          </div>
        </aside>
      </div>
    </WebShell>
  );
}
