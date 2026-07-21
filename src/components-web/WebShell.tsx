"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageEnter } from "./PageEnter";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/templates", label: "Templates" },
  { href: "/recent", label: "Recent" },
  { href: "/settings", label: "Settings" },
] as const;

export function WebShell({
  header,
  children,
}: {
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";

  return (
    <div className="relative min-h-[100dvh] bg-[var(--void)] text-[var(--ink)]">
      <div className="pointer-events-none fixed inset-0 bg-clipnews-radial opacity-90" />
      {/* grain disabled by default for paint cost; re-enable via class if needed */}

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1120px] flex-col px-4 pb-12 pt-4 md:px-8 md:pt-5">
        <nav className="mb-8 flex h-12 items-center justify-between gap-4 border-b border-[var(--line-soft)] pb-4">
          <Link href="/" className="group flex items-center gap-3">
            <span
              className="tally-blink h-2 w-2 rounded-full bg-[var(--tally)] shadow-[0_0_12px_rgba(245,197,24,0.65)]"
              aria-hidden
            />
            <span className="display-title text-[1.25rem] leading-none tracking-[-0.04em] text-[var(--ink)] transition group-hover:text-[var(--signal)]">
              ClipNews
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-[13px] font-medium transition active:scale-[0.98]",
                    active
                      ? "bg-[var(--signal-dim)] text-[var(--signal)]"
                      : "text-[var(--ink-faint)] hover:bg-white/[0.03] hover:text-[var(--ink)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {header ? (
          <header className="surface-panel mb-6 rounded-[var(--app-radius-lg)] px-5 py-4">{header}</header>
        ) : null}

        <main className="relative flex-1">
          <PageEnter>{children}</PageEnter>
        </main>
      </div>
    </div>
  );
}
