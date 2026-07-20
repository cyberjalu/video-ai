"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WebShell } from "@/components/WebShell";
import { loadRecentJobIds } from "@/lib/session-keys";

export default function RecentPage() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(loadRecentJobIds());
  }, []);

  return (
    <WebShell
      header={
        <div>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Home
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Recent jobs</h1>
          <p className="mt-1 text-sm text-zinc-400">Stored in this browser session only.</p>
        </div>
      }
    >
      {ids.length === 0 ? (
        <p className="text-sm text-zinc-500">No recent jobs in this session.</p>
      ) : (
        <ul className="space-y-2">
          {ids.map((id) => (
            <li key={id}>
              <Link href={`/jobs/${id}`} className="text-sm text-cyan-300 hover:underline">
                Job {id.slice(0, 8)}…
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WebShell>
  );
}
