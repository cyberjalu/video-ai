import type React from "react";
import { cn } from "@/lib/cn";

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "accent" | "success" | "danger" | "muted" }) {
  const variants = {
    default: "border-white/10 bg-white/5 text-zinc-200",
    accent: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    danger: "border-red-400/20 bg-red-400/10 text-red-100",
    muted: "border-white/[0.06] bg-white/[0.03] text-zinc-400",
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

