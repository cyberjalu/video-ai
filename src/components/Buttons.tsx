import type React from "react";
import { cn } from "../lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
};

export function PrimaryButton({ className, isLoading, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl border border-cyan-300/20 bg-linear-[180deg,#7ce3f8_0%,#48c8ec_52%,#2f9ec5_100%] px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_12px_30px_rgba(44,167,203,0.28)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_18px_40px_rgba(44,167,203,0.36)] active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute inset-0 signal-sweep bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.08)_45%,rgba(255,255,255,0.36)_50%,rgba(255,255,255,0.06)_56%,transparent_100%)]" />
      {isLoading ? (
        <span className="relative h-4 w-4 animate-spin rounded-full border-2 border-slate-950/20 border-t-slate-950" />
      ) : null}
      <span className="relative">{children}</span>
    </button>
  );
}

export function SecondaryButton({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] px-4 py-3 text-sm font-medium text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-px hover:border-white/[0.14] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] hover:text-zinc-100 active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

