import type React from "react";
import { cn } from "../lib/cn";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.08] bg-[#101014] shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
