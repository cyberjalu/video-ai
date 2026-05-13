import type React from "react";
import { cn } from "../lib/cn";
import { Card } from "./Card";

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
    <Card className={cn("p-6", className)}>
      <div className="flex items-start gap-4">
        {icon && (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/4 text-zinc-500">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="text-sm font-semibold text-zinc-300">{title}</div>
          {description ? (
            <div className="mt-1 text-sm leading-relaxed text-zinc-600">{description}</div>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </Card>
  );
}
