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
          <Link href="/templates" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Templates
          </Link>
          <h1 className="mt-2 text-2xl font-semibold" data-display="true">
            {tpl.name}
          </h1>
        </div>
      }
    >
      <div className="surface-panel max-w-2xl rounded-2xl p-6">
        <p className="text-zinc-300">{tpl.description}</p>
        {tpl.useCases?.length ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-400">
            {tpl.useCases.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        ) : null}
        <Link
          href={`/generate/${tpl.id}`}
          className="mt-6 inline-flex rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-100"
        >
          Use this template
        </Link>
      </div>
    </WebShell>
  );
}
