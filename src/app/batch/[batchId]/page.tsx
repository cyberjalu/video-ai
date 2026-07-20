"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { WebShell } from "@/components/WebShell";

type BatchView = {
  id: string;
  status: string;
  items: Array<{
    index: number;
    jobId?: string;
    status: string;
    error?: string;
    input: { mode: string; url?: string; prompt?: string };
  }>;
  progress: { completed: number; failed: number; total: number; percent: number };
};

export default function BatchDetailPage() {
  const params = useParams();
  const batchId = String(params?.batchId ?? "");
  const [batch, setBatch] = useState<BatchView | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      void fetch(`/api/batches/${batchId}`)
        .then((r) => r.json())
        .then((d) => {
          if (alive) setBatch(d as BatchView);
        })
        .catch(() => undefined);
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [batchId]);

  return (
    <WebShell
      header={
        <div>
          <Link href="/batch" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← New batch
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Batch {batchId.slice(0, 8)}…</h1>
          {batch ? (
            <p className="mt-1 text-sm text-zinc-400">
              {batch.status} · {batch.progress.completed}/{batch.progress.total} done ·{" "}
              {batch.progress.percent}%
            </p>
          ) : null}
        </div>
      }
    >
      {batch ? (
        <>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-cyan-400/70 transition-all"
              style={{ width: `${batch.progress.percent}%` }}
            />
          </div>
          <a
            href={`/api/batches/${batchId}/download`}
            className="mb-4 inline-flex rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100"
          >
            Download ZIP / captions
          </a>
          <ul className="space-y-2">
            {batch.items.map((item) => (
              <li
                key={item.index}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate text-zinc-200">
                    #{item.index + 1} · {item.input.url ?? item.input.prompt ?? "item"}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {item.status}
                    {item.error ? ` — ${item.error}` : ""}
                  </div>
                </div>
                {item.jobId ? (
                  <Link href={`/jobs/${item.jobId}`} className="shrink-0 text-xs text-cyan-300">
                    Open job
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-zinc-500">Loading…</p>
      )}
    </WebShell>
  );
}
