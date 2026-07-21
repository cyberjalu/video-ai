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
        "flex flex-col items-center justify-center gap-4 rounded-[var(--app-radius-lg)] border border-dashed border-[var(--line)] bg-[var(--panel)]/60 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--line)] bg-[var(--void)] text-[var(--ink-faint)]">
          {icon}
        </div>
      ) : null}
      <div>
        <div className="text-sm font-semibold text-[var(--ink-muted)]">{title}</div>
        {description ? (
          <div className="mx-auto mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-[var(--ink-faint)]">
            {description}
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}
