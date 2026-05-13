import type React from "react";
import { cn } from "../lib/cn";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-zinc-900/60 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
