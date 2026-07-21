import Link from "next/link";
import { WebShell } from "@/components/WebShell";
import { HomeCtas, HomeRecent, HomeStatus } from "@/components/HomeClient";
import { listTemplates } from "@/templates/registry";

export default function HomePage() {
  const featured = listTemplates({ enabled: true }).slice(0, 5);
  const heroTpl = featured[0];
  const primaryHref = heroTpl ? `/generate/${heroTpl.id}` : "/templates";

  return (
    <WebShell>
      <section className="relative grid items-end gap-10 pt-2 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12 lg:pt-4">
        <div className="relative z-10 max-w-xl">
          <HomeStatus />

          <h1 className="rise rise-delay-2 display-title text-[clamp(3rem,9vw,5.25rem)] leading-[0.88] text-[var(--ink)]">
            ClipNews
          </h1>

          <p className="rise rise-delay-3 mt-5 max-w-[34ch] text-[15px] leading-relaxed text-[var(--ink-muted)] md:text-[16px]">
            Local video desk. Paste a URL or prompt, review the plan, render an MP4 on this machine.
          </p>

          <HomeCtas primaryHref={primaryHref} />
        </div>

        {heroTpl ? (
          <div className="rise rise-delay-4 relative mx-auto w-full max-w-[240px] lg:mr-2 lg:ml-auto">
            <div className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(94,234,212,0.2),transparent_68%)] blur-2xl" />
            <Link
              href={`/generate/${heroTpl.id}`}
              className="group relative block overflow-hidden rounded-[28px] border-[6px] border-[#1a1d24] bg-[var(--panel)] shadow-[0_36px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/10 transition duration-200 hover:-translate-y-1 hover:ring-[color-mix(in_srgb,var(--signal)_40%,transparent)] active:scale-[0.99]"
            >
              <div className="aspect-[9/16] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroTpl.thumbnail}
                  alt=""
                  width={240}
                  height={426}
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-4 pb-4 pt-14">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--signal)]">
                  {heroTpl.aspectRatio}
                </div>
                <div className="mt-1 text-sm font-semibold text-white">{heroTpl.name}</div>
              </div>
            </Link>
          </div>
        ) : null}
      </section>

      <section className="mt-14 md:mt-16">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="display-title text-[1.65rem] text-[var(--ink)]">Templates</h2>
          <Link
            href="/templates"
            className="text-[13px] font-medium text-[var(--ink-faint)] transition hover:text-[var(--signal)]"
          >
            View all
          </Link>
        </div>
        <div className="filmstrip -mx-1">
          {featured.map((tpl, i) => (
            <div
              key={tpl.id}
              className="filmstrip-frame rise"
              style={{ animationDelay: `${80 + i * 40}ms` }}
            >
              <Link
                href={`/generate/${tpl.id}`}
                className="group relative block w-[132px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] transition duration-150 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--signal)_40%,var(--line))] active:scale-[0.98] sm:w-[148px]"
              >
                <div className="aspect-[9/16] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tpl.thumbnail}
                    alt=""
                    width={148}
                    height={263}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.05]"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2.5 pb-2.5 pt-10">
                  <div className="truncate text-[12px] font-semibold text-white">{tpl.name}</div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 border-t border-[var(--line-soft)] pt-8 md:mt-14">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="display-title text-[1.65rem] text-[var(--ink)]">Recent</h2>
          <Link
            href="/recent"
            className="text-[13px] font-medium text-[var(--ink-faint)] transition hover:text-[var(--ink)]"
          >
            All
          </Link>
        </div>
        <HomeRecent primaryHref={primaryHref} />
      </section>
    </WebShell>
  );
}
