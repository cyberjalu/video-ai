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
          <Link href="/" className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink)]">
            ← Home
          </Link>
          <h1 className="display-title mt-2 text-2xl text-[var(--ink)]">Discover</h1>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Pick a story → generate locally with viral-fast.
          </p>
        </div>
      }
    >
      {loading ? <p className="text-sm text-[var(--ink-faint)]">Loading topics…</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {topics.map((t) => (
          <article
            key={t.id}
            className="surface-panel rounded-2xl p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--signal)_25%,transparent)]"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
              {t.source}
            </div>
            <h2 className="mt-1 text-sm font-semibold text-[var(--ink)]">{t.title}</h2>
            {t.summary ? <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)]">{t.summary}</p> : null}
            <Link
              href={`/generate/viral-fast?prompt=${encodeURIComponent(`${t.title}. ${t.summary}`)}${t.url ? `&url=${encodeURIComponent(t.url)}` : ""}`}
              className="mt-3 inline-flex rounded-xl border border-[color-mix(in_srgb,var(--signal)_35%,transparent)] bg-[var(--signal-dim)] px-3 py-1.5 text-xs font-semibold text-[var(--signal)] transition hover:border-[color-mix(in_srgb,var(--signal)_50%,transparent)] active:scale-[0.98]"
            >
              Use with viral-fast
            </Link>
          </article>
        ))}
      </div>
    </WebShell>
  );
}
