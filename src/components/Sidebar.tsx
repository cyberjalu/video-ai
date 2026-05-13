import type React from "react";
import { History, LayoutTemplate, Settings2, Sparkles, Zap } from "lucide-react";
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
  { id: "create", label: "Create Video", icon: <Sparkles className="h-4 w-4" />, enabled: true },
  { id: "history", label: "History", icon: <History className="h-4 w-4" />, enabled: true },
  { id: "templates", label: "Templates", icon: <LayoutTemplate className="h-4 w-4" />, enabled: false },
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
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-900/60 shadow-card backdrop-blur relative">
      {/* Drag region for macOS window controls */}
      <div data-tauri-drag-region className="h-8 w-full shrink-0 cursor-default" />

      {/* Brand */}
      <div className="shrink-0 px-4 pb-3">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-[0_4px_16px_rgba(139,92,246,0.45)]">
            <Zap className="h-4 w-4 text-white" fill="currentColor" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-bold tracking-tight text-zinc-100">ClipNews AI</div>
              <Badge className="shrink-0 border-violet-400/25 bg-violet-400/10 text-violet-300">
                Beta
              </Badge>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-zinc-500">News → TikTok in seconds</div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/[0.06]" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 pt-2">
        <div className="space-y-0.5">
          {NAV.map((item) => {
            const isActive = item.id === active;
            return (
              <button
                key={item.id}
                type="button"
                id={`nav-${item.id}`}
                onClick={() => item.enabled && onNavigate(item.id)}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all duration-150",
                  item.enabled
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-35",
                  isActive
                    ? "bg-white/10 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : item.enabled
                      ? "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                      : "text-zinc-600",
                )}
                aria-disabled={!item.enabled}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Icon container with gradient when active */}
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-lg transition-all",
                    isActive
                      ? "bg-gradient-to-br from-violet-500/30 to-cyan-400/20 text-violet-200"
                      : "text-zinc-500 group-hover:text-zinc-300",
                  )}
                >
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {!item.enabled && (
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 p-3">
        <div className="rounded-xl border border-white/[0.07] bg-black/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-zinc-300">License</div>
            <Badge
              className={cn(
                licenseStatus === "Activated"
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : licenseStatus === "Locked"
                    ? "border-red-400/20 bg-red-400/10 text-red-300"
                    : "border-amber-400/20 bg-amber-400/10 text-amber-300",
              )}
            >
              {licenseStatus}
            </Badge>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Version</span>
            <span className="font-semibold text-zinc-400">v{pkg.version}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
