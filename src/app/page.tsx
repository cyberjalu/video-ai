import Link from "next/link";
import { WebShell } from "@/components/WebShell";
import { listTemplates } from "@/templates/registry";

export default function HomePage() {
  const featured = listTemplates({ enabled: true }).slice(0, 3);

  return (
    <WebShell
      header={
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="eyebrow-label">ClipNews Web</div>
            <h1 className="text-2xl font-semibold text-zinc-100" data-display="true">
              Free AI short-form videos
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Discover trends, batch-generate viral TikToks, publish when ready. BYOK — no account.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/discover"
              className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100"
            >
              Discover
            </Link>
            <Link
              href="/batch"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300"
            >
              Batch
            </Link>
            <Link
              href="/templates"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300"
            >
              Templates
            </Link>
            <Link
              href="/settings"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300"
            >
              Settings
            </Link>
          </div>
        </div>
      }
    >
      <section className="grid gap-4 md:grid-cols-3">
        {featured.map((tpl) => (
          <Link
            key={tpl.id}
            href={`/templates/${tpl.id}`}
            className="surface-panel rounded-2xl p-5 transition hover:border-cyan-400/20"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300/80">
              {tpl.category} · {tpl.aspectRatio}
            </div>
            <h2 className="mt-2 text-lg font-semibold text-zinc-100">{tpl.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{tpl.description}</p>
          </Link>
        ))}
      </section>
    </WebShell>
  );
}
