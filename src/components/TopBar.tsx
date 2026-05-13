import { FolderOpen, Settings2 } from "lucide-react";
import { SecondaryButton } from "./Buttons";
import { StatusPill } from "./StatusPill";
import type { GenerationStatus } from "../lib/types";

export function TopBar({
  title,
  status,
  onOpenOutputFolder,
  onOpenSettings,
}: {
  title: string;
  status: GenerationStatus;
  onOpenOutputFolder?: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="flex h-8 items-center justify-between gap-4 select-none">
      {/* Left: title + status */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-bold tracking-tight text-zinc-100">{title}</div>
        </div>
        <StatusPill status={status} />
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-2">
        {onOpenOutputFolder ? (
          <SecondaryButton onClick={onOpenOutputFolder} className="h-8 gap-1.5 px-3 text-xs">
            <FolderOpen className="h-3.5 w-3.5" />
            Open Output Folder
          </SecondaryButton>
        ) : null}
        <SecondaryButton
          onClick={onOpenSettings}
          className="h-8 w-8 rounded-lg p-0"
          aria-label="Settings"
          id="topbar-settings-btn"
        >
          <Settings2 className="h-4 w-4" />
        </SecondaryButton>
      </div>
    </div>
  );
}
