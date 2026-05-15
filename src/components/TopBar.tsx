import { FolderOpen } from "lucide-react";
import { StatusPill } from "./StatusPill";
import type { GenerationStatus } from "../lib/types";

export function TopBar({
  title,
  status,
  onOpenOutputFolder,
}: {
  title: string;
  status: GenerationStatus;
  onOpenOutputFolder?: () => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 select-none rounded-[18px] border border-white/[0.05] bg-white/[0.025] px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
      {/* Left: title + status */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="surface-inset flex h-9 w-9 items-center justify-center rounded-2xl border-white/[0.06] bg-white/[0.03] text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
          CN
        </div>
        <div className="min-w-0">
          <div className="eyebrow-label mb-1">Workspace</div>
          <div className="truncate text-[15px] font-semibold tracking-tight text-zinc-100">{title}</div>
        </div>
        <StatusPill status={status} />
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-2">
        {onOpenOutputFolder ? (
          <button
            onClick={onOpenOutputFolder}
            className="inline-flex h-9 items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs font-medium text-zinc-400 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-zinc-100"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Output Folder
          </button>
        ) : null}
      </div>
    </div>
  );
}
