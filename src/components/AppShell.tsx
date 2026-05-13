import type React from "react";
import { cn } from "../lib/cn";

export function AppShell({
  sidebar,
  topbar,
  children,
}: {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="h-full w-full overflow-hidden bg-zinc-950 bg-clipnews-radial">
      <div className="flex h-full w-full">
        {/* Sidebar */}
        <div className="flex h-full w-[260px] shrink-0 flex-col overflow-hidden p-4">
          {sidebar}
        </div>

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Topbar */}
          <div className="shrink-0 border-b border-white/[0.06] px-8 py-4">
            {topbar}
          </div>

          {/* Content */}
          <div
            className={cn(
              "min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-8 pb-12 pt-8",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
