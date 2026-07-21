import Link from "next/link";
import { notFound } from "next/navigation";
import { WebShell } from "@/components/WebShell";
import { getTemplate } from "@/templates/registry";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tpl = getTemplate(id);
  if (!tpl || !tpl.enabled) notFound();

  return (
    <WebShell
      header={
        <div>
          <Link href="/templates" className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink)]">
            ← Templates
          </Link>
          <h1 className="display-title mt-2 text-3xl text-[var(--ink)]">{tpl.name}</h1>
        </div>
      }
    >
      <div className="surface-panel-strong max-w-2xl rounded-[22px] p-6">
        <p className="text-[var(--ink-muted)]">{tpl.description}</p>
        {tpl.useCases?.length ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[var(--ink-muted)]">
            {tpl.useCases.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        ) : null}
        <Link
          href={`/generate/${tpl.id}`}
          className="relative mt-6 inline-flex items-center justify-center overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--signal)_25%,transparent)] bg-linear-[180deg,#7ce3f8_0%,#48c8ec_52%,#2f9ec5_100%] px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset,0_12px_30px_rgba(44,167,203,0.28)] transition-all duration-200 hover:-translate-y-px active:scale-[0.985]"
        >
          <span className="pointer-events-none absolute inset-0 signal-sweep bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.08)_45%,rgba(255,255,255,0.36)_50%,rgba(255,255,255,0.06)_56%,transparent_100%)]" />
          <span className="relative">Use this template</span>
        </Link>
      </div>
    </WebShell>
  );
}
