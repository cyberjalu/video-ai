import type React from "react";

export function WebShell({
  header,
  children,
}: {
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#08080b] text-zinc-100 selection:bg-cyan-500/30">
      <div className="pointer-events-none fixed inset-0 bg-clipnews-radial opacity-55" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-8">
        {header ? (
          <header className="surface-panel mb-6 rounded-[22px] px-5 py-4">{header}</header>
        ) : null}
        <main className="relative flex-1">{children}</main>
      </div>
    </div>
  );
}
