"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WebShell } from "@/components/WebShell";

type Trend = {
  id: string;
  title: string;
  summary: string;
  source: string;
  url?: string;
};

export default function DiscoverPage() {
  const [topics, setTopics] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/trends")
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load trends");
        return r.json() as Promise<{ topics: Trend[] }>;
      })
      .then((d) => setTopics(d.topics))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WebShell
      header={
        <div>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Home
          </Link>
          <h1 className="mt-2 text-xl font-semibold">Discover trending topics</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Pick a story → generate with viral-fast in one click.
          </p>
        </div>
      }
    >
      {loading ? <p className="text-sm text-zinc-500">Loading topics…</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {topics.map((t) => (
          <article key={t.id} className="surface-panel rounded-2xl p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {t.source}
            </div>
            <h2 className="mt-1 text-sm font-semibold text-zinc-100">{t.title}</h2>
            {t.summary ? <p className="mt-2 text-xs leading-relaxed text-zinc-400">{t.summary}</p> : null}
            <Link
              href={`/generate/viral-fast?prompt=${encodeURIComponent(`${t.title}. ${t.summary}`)}${t.url ? `&url=${encodeURIComponent(t.url)}` : ""}`}
              className="mt-3 inline-flex rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100"
            >
              Use with viral-fast
            </Link>
          </article>
        ))}
      </div>
    </WebShell>
  );
}
