"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { WebShell } from "@/components/WebShell";

const TOKEN_KEY = "clipnews.tiktok.tokens";

type TikTokTokens = {
  access_token: string;
  refresh_token: string;
  open_id: string;
  expires_at: number;
};

function loadTokens(): TikTokTokens | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as TikTokTokens;
    if (t.expires_at < Date.now()) return null;
    return t;
  } catch {
    return null;
  }
}

function saveTokens(t: TikTokTokens) {
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}

function TikTokInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams?.get("jobId") ?? "";
  const [tokens, setTokens] = useState<TikTokTokens | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const err = searchParams?.get("error");
    if (err) setError(decodeURIComponent(err));

    if (searchParams?.get("connected") === "1") {
      const access_token = searchParams.get("access_token") ?? "";
      const refresh_token = searchParams.get("refresh_token") ?? "";
      const open_id = searchParams.get("open_id") ?? "";
      const expires_in = Number(searchParams.get("expires_in") ?? 86400);
      if (access_token) {
        const t: TikTokTokens = {
          access_token,
          refresh_token,
          open_id,
          expires_at: Date.now() + expires_in * 1000,
        };
        saveTokens(t);
        setTokens(t);
        // Strip tokens from URL
        router.replace(jobId ? `/tiktok?jobId=${jobId}` : "/tiktok");
      }
    } else {
      setTokens(loadTokens());
    }
  }, [searchParams, router, jobId]);

  async function onPublish() {
    if (!tokens || !jobId || !confirmed) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/tiktok/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          accessToken: tokens.access_token,
          openId: tokens.open_id,
          confirm: true,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; publishId?: string; note?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      setMessage(`${data.note ?? "Published"} (id: ${data.publishId})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WebShell
      header={
        <div>
          <Link href={jobId ? `/jobs/${jobId}/result` : "/"} className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Back
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Publish to TikTok</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Connect your TikTok account, confirm, then publish. Max 5 posts/day. No silent auto-post.
          </p>
        </div>
      }
    >
      <div className="surface-panel max-w-lg space-y-4 rounded-2xl p-6">
        {!tokens ? (
          <a
            href="/api/tiktok/auth"
            className="inline-flex rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100"
          >
            Connect TikTok
          </a>
        ) : (
          <p className="text-sm text-zinc-300">
            Connected{tokens.open_id ? ` · ${tokens.open_id.slice(0, 8)}…` : ""}. Tokens stay in this
            browser session only.
          </p>
        )}

        {jobId ? (
          <>
            <p className="text-xs text-zinc-500">Job: {jobId.slice(0, 8)}…</p>
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              I confirm I want to publish this video to my TikTok account
            </label>
            <button
              type="button"
              disabled={!tokens || !confirmed || busy}
              onClick={() => void onPublish()}
              className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-50"
            >
              {busy ? "Publishing…" : "Publish now"}
            </button>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Open this page from a job result (Publish to TikTok) to select a video.
          </p>
        )}

        {message ? <p className="text-sm text-cyan-200">{message}</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>
    </WebShell>
  );
}

export default function TikTokPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-400">Loading…</div>}>
      <TikTokInner />
    </Suspense>
  );
}
