"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WebShell } from "@/components/WebShell";
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
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Home
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Recent</h1>
          <p className="mt-1 text-sm text-zinc-400">Stored in this browser session only.</p>
        </div>
      }
    >
      <h2 className="text-sm font-semibold text-zinc-300">Jobs</h2>
      {ids.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">No recent jobs.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {ids.map((id) => (
            <li key={id}>
              <Link href={`/jobs/${id}`} className="text-sm text-cyan-300 hover:underline">
                Job {id.slice(0, 8)}…
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-sm font-semibold text-zinc-300">Batches</h2>
      {batches.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">No recent batches.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {batches.map((id) => (
            <li key={id}>
              <Link href={`/batch/${id}`} className="text-sm text-cyan-300 hover:underline">
                Batch {id.slice(0, 8)}…
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WebShell>
  );
}
