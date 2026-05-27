import type React from "react";
import { History, LayoutTemplate, Settings2, Sparkles, Zap, MonitorPlay } from "lucide-react";
import pkg from "../../package.json";
import { cn } from "../lib/cn";
import type { AppPage } from "../lib/types";
import { Badge } from "./Badge";

type NavItem = {
  id: AppPage;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
};

const NAV: NavItem[] = [
  { id: "create", label: "Create TikTok", icon: <Sparkles className="h-4 w-4" />, enabled: true },
  { id: "youtube", label: "YouTube Video", icon: <MonitorPlay className="h-4 w-4" />, enabled: true },
  { id: "history", label: "History", icon: <History className="h-4 w-4" />, enabled: true },
  { id: "templates", label: "Templates", icon: <LayoutTemplate className="h-4 w-4" />, enabled: true },
  { id: "settings", label: "Settings", icon: <Settings2 className="h-4 w-4" />, enabled: true },
];

export function Sidebar({
  active,
  onNavigate,
  licenseStatus,
}: {
  active: AppPage;
  onNavigate: (p: AppPage) => void;
  licenseStatus: "Activated" | "Trial" | "Locked";
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Drag region for macOS window controls */}
      <div data-tauri-drag-region className="h-8 w-full shrink-0 cursor-default" />

      {/* Brand */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className="eyebrow-label mb-3">ClipNews</div>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(99,214,243,0.12),rgba(255,255,255,0.04))] shadow-[0_12px_32px_rgba(32,114,145,0.18)]">
            <div className="ambient-breathe absolute inset-0 rounded-2xl bg-cyan-300/10 blur-xl" />
            <Zap className="relative h-5 w-5 text-cyan-200" fill="currentColor" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5">
              <div className="truncate text-[22px] font-semibold leading-none text-zinc-100">ClipNews</div>
              <Badge variant="muted" className="shrink-0 text-[9px] text-cyan-200">
                Beta
              </Badge>
            </div>
            <div className="mt-1 truncate text-[11px] font-medium tracking-[0.01em] text-zinc-500">Article-to-video desktop studio</div>
          </div>
        </div>
      </div>

      <div className="mx-3 mb-4 h-px bg-linear-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 pt-1">
        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">Workspace</div>
        <div className="space-y-1.5">
          {NAV.map((item) => {
            const isActive = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                id={`nav-${item.id}`}
                onClick={() => item.enabled && onNavigate(item.id)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                  item.enabled ? "cursor-pointer" : "cursor-not-allowed opacity-40",
                  isActive
                    ? "border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(99,214,243,0.12),rgba(255,255,255,0.03))] text-zinc-50 shadow-[0_10px_28px_rgba(24,105,132,0.16)]"
                    : item.enabled
                      ? "border border-transparent text-zinc-400 hover:border-white/[0.05] hover:bg-white/[0.04] hover:text-zinc-200"
                      : "text-zinc-600",
                )}
                aria-disabled={!item.enabled}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active left accent bar */}
                {isActive && (
                  <>
                    <span className="absolute left-0 top-1/2 h-10 w-1 -translate-y-1/2 rounded-r-full bg-cyan-300" />
                    <span className="pointer-events-none absolute inset-0 rounded-2xl bg-cyan-300/5" />
                  </>
                )}
                <span
                  className={cn(
                    "relative z-10 flex shrink-0 transition-colors",
                    isActive ? "text-cyan-200" : "text-zinc-500 group-hover:text-zinc-300",
                  )}
                >
                  {item.icon}
                </span>
                <div className="relative z-10 flex-1 truncate">{item.label}</div>
                {!item.enabled && (
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 p-4">
        <div className="surface-inset rounded-[20px] p-3.5">
          <div className="eyebrow-label mb-2">System</div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-zinc-200">License</div>
            <Badge
              variant={licenseStatus === "Activated" ? "success" : licenseStatus === "Locked" ? "danger" : "muted"}
              className={cn(
                licenseStatus === "Activated"
                  ? ""
                  : licenseStatus === "Locked"
                    ? ""
                    : "text-amber-200",
              )}
            >
              {licenseStatus}
            </Badge>
          </div>
          <div className="mt-3 rounded-2xl border border-white/[0.05] bg-black/20 px-3 py-2.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Version</span>
              <span className="font-medium text-zinc-300">v{pkg.version}</span>
            </div>
            <div className="mt-1 text-[11px] leading-5 text-zinc-600">Fast desktop pipeline for short-form publishing.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
