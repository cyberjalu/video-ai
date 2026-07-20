"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { VideoPreviewCard } from "@/components/VideoPreviewCard";
import { WebShell } from "@/components/WebShell";
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
          <Link href={`/jobs/${jobId}`} className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Job progress
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Your video</h1>
          {expiresAt ? (
            <p className="mt-1 text-xs text-zinc-500">
              Link expires {new Date(expiresAt).toLocaleString()} — download before then.
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
              <div className="font-semibold text-zinc-100">
                Viral QC: {qc.pass ? "pass" : "warn"} ({qc.score})
              </div>
              {qc.reasons.length ? (
                <ul className="mt-2 list-disc pl-4 text-xs text-zinc-400">
                  {qc.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-zinc-500">Retention structure looks good.</p>
              )}
            </div>
          ) : null}

          {captionPack ? (
            <div className="surface-panel space-y-3 rounded-2xl p-4 text-sm">
              <div className="font-semibold text-zinc-100">Caption pack</div>
              <p className="text-xs text-zinc-400">{captionPack.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {captionPack.hashtags.map((h) => (
                  <span
                    key={h}
                    className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[11px] text-cyan-100"
                  >
                    {h}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500">Best time: {captionPack.postingTimeHint}</p>
              <button
                type="button"
                onClick={() => void copy(captionPack.hashtags.join(" "), "hashtags")}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-300"
              >
                Copy hashtags
              </button>
              <button
                type="button"
                onClick={() => void copy(captionPack.fullCaption, "full")}
                className="ml-2 rounded-xl border border-white/10 px-3 py-1.5 text-xs text-zinc-300"
              >
                Copy full caption
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy(window.location.href, "link")}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300"
            >
              Copy share link
            </button>
            <Link
              href={`/tiktok?jobId=${jobId}`}
              className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100"
            >
              Publish to TikTok
            </Link>
            {copied ? <span className="self-center text-xs text-cyan-300">Copied {copied}!</span> : null}
          </div>
        </aside>
      </div>
    </WebShell>
  );
}
