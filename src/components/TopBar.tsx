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
    <div className="flex h-8 items-center justify-between gap-4 select-none">
      {/* Left: title + status */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold tracking-tight text-zinc-100">{title}</div>
        </div>
        <StatusPill status={status} />
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-2">
        {onOpenOutputFolder ? (
          <button
            onClick={onOpenOutputFolder}
            className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Output Folder
          </button>
        ) : null}
      </div>
    </div>
  );
}
