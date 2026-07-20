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

export default function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  return <TemplatesGallery searchParams={searchParams} />;
}

async function TemplatesGallery({
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
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Home
          </Link>
          <h1 className="mt-2 text-2xl font-semibold" data-display="true">
            Templates
          </h1>
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={c.id === "all" ? "/templates" : `/templates?category=${c.id}`}
            className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-300 hover:border-cyan-400/30"
          >
            {c.label}
          </Link>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((tpl) => (
          <Link
            key={tpl.id}
            href={`/templates/${tpl.id}`}
            className="surface-panel flex gap-4 rounded-2xl p-4 hover:border-cyan-400/20"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tpl.thumbnail} alt="" className="h-24 w-14 rounded-lg object-cover" />
            <div>
              <div className="text-xs text-zinc-500">
                {tpl.category} · {tpl.aspectRatio}
              </div>
              <h2 className="font-semibold text-zinc-100">{tpl.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{tpl.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </WebShell>
  );
}
