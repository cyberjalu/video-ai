"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WebShell } from "@/components/WebShell";
import { PrimaryButton } from "@/components/Buttons";
import { loadSessionGeminiKey, loadSessionPexelsKey, pushRecentBatchId } from "@/lib/session-keys";

export default function BatchPage() {
  const router = useRouter();
  const [urls, setUrls] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [autoRender, setAutoRender] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const gemini = loadSessionGeminiKey();
    if (!gemini) {
      router.push("/settings?return=/batch");
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.append("gemini", gemini);
      form.append("pexels", loadSessionPexelsKey());
      form.append("templateId", "viral-fast");
      form.append("autoRender", String(autoRender));
      form.append("urls", urls);
      if (file) form.append("file", file);

      const res = await fetch("/api/batches", { method: "POST", body: form });
      const data = (await res.json()) as { batchId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Batch failed");
      if (data.batchId) {
        pushRecentBatchId(data.batchId);
        router.push(`/batch/${data.batchId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <WebShell
      header={
        <div>
          <Link href="/" className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink)]">
            ← Home
          </Link>
          <h1 className="display-title mt-2 text-2xl text-[var(--ink)]">Batch generate</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Paste URLs (one per line) or upload CSV. Max 20 items — runs on your machine.
          </p>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="surface-panel-strong max-w-xl space-y-4 rounded-[22px] p-6">
        <label className="block text-sm">
          <span className="text-[var(--ink-muted)]">URLs / prompts (one per line)</span>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows={8}
            placeholder={"https://example.com/news/1\nAI chip shortage explained"}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--ink-muted)]">Or CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm text-[var(--ink-muted)]"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--ink-muted)]">
          <input type="checkbox" checked={autoRender} onChange={(e) => setAutoRender(e.target.checked)} />
          Auto-render after plan (skip manual review)
        </label>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <PrimaryButton type="submit" disabled={busy} isLoading={busy}>
          {busy ? "Starting batch…" : "Start batch"}
        </PrimaryButton>
      </form>
    </WebShell>
  );
}
