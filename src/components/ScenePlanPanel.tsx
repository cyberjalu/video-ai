import { ChevronDown, Layers3 } from "lucide-react";
import { cn } from "../lib/cn";
import type { VideoPlan } from "../lib/types";
import { toAssetSrc } from "../lib/tauri";
import { Card } from "./Card";
import { EmptyState } from "./EmptyState";

function roleLabel(role: string) {
  const map: Record<string, string> = {
    hook: "Hook",
    re_hook: "Re-hook",
    why_matters: "Why it matters",
    what_happened: "What happened",
    evidence: "Proof",
    context: "Context",
    impact: "Impact",
    takeaway: "CTA",
  };
  return map[role] ?? role;
}

export function ScenePlanPanel({ plan }: { plan?: VideoPlan | null }) {
  if (!plan) {
    return (
      <EmptyState
        title="Scene plan will be generated automatically"
        description="We’ll break the article into a hook, proof, key facts, and a closing CTA."
        icon={<Layers3 className="h-5 w-5" />}
      />
    );
  }

  return (
    <details className="group">
      <summary className="list-none">
        <Card className="cursor-pointer p-5 transition hover:bg-zinc-900/70">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Layers3 className="h-4 w-4 text-zinc-300" />
              Scene plan
              <span className="ml-2 text-xs font-semibold text-zinc-400">
                {plan.scenes.length} scenes · {plan.target_duration_sec}s
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-zinc-400 transition group-open:rotate-180" />
          </div>
          <div className="mt-2 text-sm text-zinc-400">
            Optional details for advanced users. You can skim or ignore this section.
          </div>
        </Card>
      </summary>

      <div className="mt-3 space-y-2">
        {plan.scenes.map((s, idx) => {
          const thumb = s.screenshot_path ? toAssetSrc(s.screenshot_path) : null;
          const caption = s.caption_lines?.filter(Boolean).join(" · ");

          return (
            <Card key={s.id} className="p-4">
              <div className="flex gap-4">
                <div
                  className={cn(
                    "h-[72px] w-[128px] overflow-hidden rounded-xl border border-white/10 bg-black/40",
                    !thumb ? "grid place-items-center text-xs text-zinc-500" : "",
                  )}
                >
                  {thumb ? (
                    <img src={thumb} className="h-full w-full object-cover" alt="" />
                  ) : (
                    "No thumbnail"
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-semibold text-zinc-100">
                      Scene {idx + 1} · {roleLabel(s.role)}
                    </div>
                    <div className="shrink-0 text-xs font-semibold text-zinc-400">{s.duration_sec}s</div>
                  </div>
                  {caption ? <div className="mt-1 text-sm text-zinc-300">{caption}</div> : null}
                  {s.callouts?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.callouts.slice(0, 2).map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-zinc-200"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </details>
  );
}

