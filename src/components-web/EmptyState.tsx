import type React from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  description,
  icon,
  className,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-500">
          {icon}
        </div>
      ) : null}
      <div>
        <div className="text-sm font-semibold text-zinc-400">{title}</div>
        {description ? (
          <div className="mt-1 max-w-[280px] text-xs leading-relaxed text-zinc-600">{description}</div>
        ) : null}
      </div>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
