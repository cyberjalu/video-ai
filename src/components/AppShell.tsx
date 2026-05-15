import type React from "react";

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
    <div className="h-full w-full overflow-hidden bg-[#09090b] text-zinc-100 selection:bg-cyan-500/30">
      <div className="flex h-full w-full">
        {/* Sidebar */}
        <div className="flex h-full w-[260px] shrink-0 flex-col border-r border-white/5 bg-[#0c0c0e] p-3">
          {sidebar}
        </div>

        {/* Main area */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#09090b]">
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute left-[-10%] top-[-20%] h-[50%] w-[50%] rounded-full bg-cyan-500/5 blur-[120px]" />
          <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[50%] w-[50%] rounded-full bg-violet-500/5 blur-[120px]" />

          {/* Topbar wrapper with drag region */}
          <div data-tauri-drag-region className="z-10 shrink-0 border-b border-white/5 bg-[#09090b]/80 px-8 py-4 backdrop-blur-md cursor-default">
            {topbar}
          </div>

          {/* Content */}
          <div className="z-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-8 pb-12 pt-8">
            <div className="mx-auto w-full">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
