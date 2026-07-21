import type React from "react";
import { cn } from "@/lib/cn";

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "accent" | "success" | "danger" | "muted";
}) {
  const variants = {
    default: "border-[var(--line)] bg-white/5 text-[var(--ink)]",
    accent: "border-[color-mix(in_srgb,var(--signal)_25%,transparent)] bg-[var(--signal-dim)] text-[var(--signal)]",
    success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    danger: "border-red-400/20 bg-red-400/10 text-red-100",
    muted: "border-[var(--line-soft)] bg-white/[0.03] text-[var(--ink-muted)]",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
