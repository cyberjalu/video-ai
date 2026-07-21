import Link from "next/link";
import { WebShell } from "@/components/WebShell";
import { listTemplates, type TemplateCategory } from "@/templates/registry";

const CATEGORIES: Array<{ id: TemplateCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "tiktok", label: "TikTok" },
  { id: "explainer", label: "Explainer" },
  { id: "youtube", label: "YouTube" },
  { id: "education", label: "Education" },
];

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const cat = category as TemplateCategory | undefined;
  const templates = listTemplates({
    enabled: true,
    category: cat && cat !== ("all" as TemplateCategory) ? cat : undefined,
  });

  return (
    <WebShell
      header={
        <div>
          <Link href="/" className="text-xs text-[var(--ink-faint)] transition hover:text-[var(--ink)]">
            ← Home
          </Link>
          <h1 className="display-title mt-2 text-3xl text-[var(--ink)] md:text-4xl">Templates</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--ink-muted)]">
            Pick a look, then generate on your machine.
          </p>
        </div>
      }
    >
      <div className="mb-8 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = (c.id === "all" && !cat) || cat === c.id;
          return (
            <Link
              key={c.id}
              href={c.id === "all" ? "/templates" : `/templates?category=${c.id}`}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                active
                  ? "border-teal-300/35 bg-[var(--signal-dim)] text-[var(--signal)]"
                  : "border-[var(--line)] text-[var(--ink-faint)] hover:border-teal-300/25 hover:text-[var(--ink)]"
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => (
          <Link
            key={tpl.id}
            href={`/templates/${tpl.id}`}
            className="group overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] transition duration-200 hover:-translate-y-0.5 hover:border-teal-300/35 active:scale-[0.99]"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-[var(--void)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tpl.thumbnail}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-top opacity-90 transition duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--panel)] via-transparent to-transparent" />
            </div>
            <div className="relative -mt-8 px-4 pb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                {tpl.category} · {tpl.aspectRatio}
              </div>
              <h2 className="mt-1 text-base font-semibold text-[var(--ink)] group-hover:text-[var(--signal)]">
                {tpl.name}
              </h2>
              <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[var(--ink-muted)]">
                {tpl.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </WebShell>
  );
}
