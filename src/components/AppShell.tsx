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
    <div className="h-full w-full overflow-hidden bg-[#08080b] text-zinc-100 selection:bg-cyan-500/30">
      <div className="relative flex h-full w-full">
        <div className="pointer-events-none absolute inset-0 bg-clipnews-radial opacity-55" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.025),transparent_26%)] opacity-60" />

        {/* Sidebar */}
        <div className="surface-panel relative z-10 m-3 mr-0 flex h-[calc(100%-24px)] w-[258px] shrink-0 flex-col rounded-[24px] p-3">
          {sidebar}
        </div>

        {/* Main area */}
        <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-3">
          {/* Ambient glows */}
          <div className="pointer-events-none absolute left-[-5%] top-[-15%] h-[45%] w-[45%] rounded-full bg-cyan-500/[0.07] blur-[100px]" />
          <div className="pointer-events-none absolute bottom-[-15%] right-[-5%] h-[45%] w-[45%] rounded-full bg-sky-500/[0.06] blur-[100px]" />
          <div className="pointer-events-none absolute left-[40%] top-[30%] h-[30%] w-[30%] rounded-full bg-blue-500/[0.04] blur-[80px]" />

          <div className="relative z-10 shrink-0 rounded-[22px] border border-white/[0.05] bg-white/[0.025] px-4 py-3 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
            <div className="px-1">
              {topbar}
            </div>
          </div>

          {/* Content */}
          <div className="relative z-0 mt-3 min-w-0 flex-1 overflow-y-auto overflow-x-hidden rounded-[24px] border border-white/[0.04] bg-[linear-gradient(180deg,rgba(8,10,13,0.46),rgba(8,10,13,0.2))] px-7 pb-10 pt-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-white/[0.018] to-transparent" />
            <div className="relative mx-auto w-full">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
