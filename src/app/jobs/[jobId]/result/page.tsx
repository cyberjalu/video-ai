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

export default function JobResultPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = String(params?.jobId ?? "");
  const [plan, setPlan] = useState<VideoPlan | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void getJob(jobId).then((j) => {
      if (j.plan) setPlan(j.plan);
      setExpiresAt(j.expiresAt);
      setStatus(j.status);
    });
  }, [jobId]);

  const mp4Url = status === "completed" ? downloadUrl(jobId) : null;
  const captionText = plan ? buildCaptionText(plan) : null;

  async function onCopyCaption() {
    if (!captionText) return;
    await navigator.clipboard.writeText(captionText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function onRerender() {
    if (!loadSessionGeminiKey()) {
      router.push(`/settings?return=/jobs/${jobId}/result`);
      return;
    }
    await startRender(jobId);
    router.push(`/jobs/${jobId}`);
  }

  function onShare() {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <VideoPreviewCard
        title={plan?.title}
        durationSec={plan?.target_duration_sec}
        sceneCount={plan?.scenes.length}
        mp4Url={mp4Url}
        captionText={captionText}
        onCreateAnother={() => router.push("/templates")}
        onCopyCaption={() => void onCopyCaption()}
        onRerender={status === "completed" ? () => void onRerender() : undefined}
      />

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onShare}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300"
        >
          Copy share link
        </button>
        {copied ? <span className="self-center text-xs text-cyan-300">Copied!</span> : null}
      </div>
    </WebShell>
  );
}
