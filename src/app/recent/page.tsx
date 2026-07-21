"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Film, Layers } from "lucide-react";
import { WebShell } from "@/components/WebShell";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/Buttons";
import { loadRecentJobIds, loadRecentBatchIds } from "@/lib/session-keys";

export default function RecentPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [batches, setBatches] = useState<string[]>([]);

  useEffect(() => {
    setIds(loadRecentJobIds());
    setBatches(loadRecentBatchIds());
  }, []);

  return (
    <WebShell
      header={
        <div>
          <Link href="/" className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink)]">
            ← Home
          </Link>
          <h1 className="display-title mt-2 text-2xl text-[var(--ink)]">Recent</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Stored in this browser only — nothing uploaded to a host.</p>
        </div>
      }
    >
      <h2 className="eyebrow-label">Jobs</h2>
      {ids.length === 0 ? (
        <EmptyState
          className="mt-3"
          title="No recent jobs"
          description="Generate a video from Templates — it will show up here on this machine."
          icon={<Film className="h-5 w-5" />}
        >
          <Link href="/templates">
            <PrimaryButton type="button" className="text-sm">
              Browse templates
            </PrimaryButton>
          </Link>
        </EmptyState>
      ) : (
        <ul className="surface-panel mt-3 divide-y divide-white/[0.05] overflow-hidden rounded-2xl">
          {ids.map((id) => (
            <li key={id}>
              <Link
                href={`/jobs/${id}`}
                className="flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-white/[0.03] active:scale-[0.995]"
              >
                <Film className="h-4 w-4 text-[var(--signal)]/70" />
                <span className="font-medium text-[var(--ink)]">Job {id.slice(0, 8)}…</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="eyebrow-label mt-10">Batches</h2>
      {batches.length === 0 ? (
        <EmptyState
          className="mt-3"
          title="No recent batches"
          description="Optional batch queue for multiple URLs — still runs locally."
          icon={<Layers className="h-5 w-5" />}
        />
      ) : (
        <ul className="surface-panel mt-3 divide-y divide-white/[0.05] overflow-hidden rounded-2xl">
          {batches.map((id) => (
            <li key={id}>
              <Link
                href={`/batch/${id}`}
                className="flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-white/[0.03]"
              >
                <Layers className="h-4 w-4 text-[var(--signal)]/70" />
                <span className="font-medium text-[var(--ink)]">Batch {id.slice(0, 8)}…</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WebShell>
  );
}
