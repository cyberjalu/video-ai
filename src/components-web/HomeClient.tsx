"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PrimaryButton } from "@/components/Buttons";
import { EmptyState } from "@/components/EmptyState";
import { loadRecentJobIds, loadSessionGeminiKey } from "@/lib/session-keys";
import { Clapperboard } from "lucide-react";

export function HomeStatus() {
  const [hasGemini, setHasGemini] = useState<boolean | null>(null);

  useEffect(() => {
    setHasGemini(Boolean(loadSessionGeminiKey()));
  }, []);

  if (hasGemini === null) {
    return (
      <div className="mb-5 inline-flex h-[30px] items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--ink-faint)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          Local desk
        </span>
      </div>
    );
  }

  return (
    <div className="rise rise-delay-1 mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1">
      <span
        className={`h-1.5 w-1.5 rounded-full ${hasGemini ? "tally-blink bg-[var(--tally)]" : "bg-[var(--ink-faint)]"}`}
      />
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
        {hasGemini ? "Desk ready" : "Add keys to go live"}
      </span>
      {!hasGemini ? (
        <Link
          href="/settings"
          className="ml-1 text-[11px] font-semibold text-[var(--tally)] underline-offset-2 hover:underline"
        >
          Settings
        </Link>
      ) : null}
    </div>
  );
}

export function HomeCtas({ primaryHref }: { primaryHref: string }) {
  const [hasGemini, setHasGemini] = useState(true);

  useEffect(() => {
    setHasGemini(Boolean(loadSessionGeminiKey()));
  }, []);

  return (
    <div className="rise rise-delay-3 mt-8 flex flex-wrap items-center gap-3">
      <Link href={primaryHref}>
        <PrimaryButton type="button">New video</PrimaryButton>
      </Link>
      <Link href="/templates">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-2.5 text-sm font-medium text-[var(--ink-muted)] transition duration-150 hover:-translate-y-px hover:border-teal-300/40 hover:text-[var(--ink)] active:scale-[0.985]"
        >
          Browse templates
        </button>
      </Link>
      {!hasGemini ? (
        <Link
          href="/settings"
          className="text-[13px] font-medium text-[var(--tally)] underline-offset-4 transition hover:underline"
        >
          Open settings
        </Link>
      ) : null}
    </div>
  );
}

export function HomeRecent({ primaryHref }: { primaryHref: string }) {
  const [recent, setRecent] = useState<string[] | null>(null);

  useEffect(() => {
    setRecent(loadRecentJobIds().slice(0, 6));
  }, []);

  if (recent === null) {
    return (
      <div className="h-24 animate-pulse rounded-[var(--app-radius-lg)] border border-[var(--line-soft)] bg-[var(--panel)]/40" />
    );
  }

  if (recent.length === 0) {
    return (
      <EmptyState
        title="No jobs yet"
        description="Generate once and it shows up here on this browser only."
        icon={<Clapperboard className="h-5 w-5" />}
      >
        <Link href={primaryHref}>
          <PrimaryButton type="button" className="text-sm">
            Create first video
          </PrimaryButton>
        </Link>
      </EmptyState>
    );
  }

  return (
    <ul className="divide-y divide-[var(--line-soft)] border-y border-[var(--line-soft)]">
      {recent.map((id, i) => (
        <li key={id}>
          <Link
            href={`/jobs/${id}`}
            className="flex items-center gap-4 py-3.5 text-sm transition hover:bg-white/[0.02] active:scale-[0.997]"
          >
            <span className="w-6 font-mono text-[11px] text-[var(--ink-faint)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="font-medium text-[var(--ink)]">Job {id.slice(0, 8)}</span>
            <span className="ml-auto text-[12px] text-[var(--signal)]">Open</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
