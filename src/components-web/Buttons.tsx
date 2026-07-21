import type React from "react";
import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
};

export function PrimaryButton({ className, isLoading, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl border border-teal-300/40 bg-[var(--signal)] px-5 py-2.5 text-sm font-semibold text-[var(--void)] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_10px_28px_rgba(94,234,212,0.22)] transition duration-150 hover:-translate-y-px hover:brightness-105 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute inset-0 signal-sweep bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.12)_46%,rgba(255,255,255,0.45)_50%,rgba(255,255,255,0.1)_54%,transparent_100%)]" />
      {isLoading ? (
        <span className="relative h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
      ) : null}
      <span className="relative">{children}</span>
    </button>
  );
}

export function SecondaryButton({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-2.5 text-sm font-medium text-[var(--ink-muted)] transition duration-150 hover:-translate-y-px hover:border-teal-300/40 hover:text-[var(--ink)] active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
