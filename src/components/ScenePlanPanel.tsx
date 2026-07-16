import { ChevronDown, ImagePlus, Layers3, Trash2, Video } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { cn } from "../lib/cn";
import type { VideoPlan } from "../lib/types";
import { clearSceneAsset, copySceneAsset, toAssetSrc, writePlanJson } from "../lib/tauri";
import { Card } from "./Card";
import { EmptyState } from "./EmptyState";
import { SecondaryButton } from "./Buttons";

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

function layoutBadge(layout?: string) {
  if (!layout) return null;
  const label =
    layout === "bar_chart" ? "chart" : layout === "screenshot" ? "shot" : layout;
  return (
    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
      {label}
    </span>
  );
}

export function ScenePlanPanel({
  plan,
  editable = false,
  projectDir,
  onPlanChange,
}: {
  plan?: VideoPlan | null;
  editable?: boolean;
  projectDir?: string | null;
  onPlanChange?: (plan: VideoPlan) => void;
}) {
  if (!plan) {
    return (
      <EmptyState
        title="Scene plan will be generated automatically"
        description="We’ll break the article into a hook, proof, key facts, and a closing CTA."
        icon={<Layers3 className="h-5 w-5" />}
      />
    );
  }

  const currentPlan: VideoPlan = plan;
  const canEdit = editable && !!projectDir && !!onPlanChange;

  async function persist(next: VideoPlan) {
    if (!projectDir || !onPlanChange) return;
    onPlanChange(next);
    await writePlanJson(projectDir, next);
  }

  async function attachFile(sceneId: string, kind: "image" | "video") {
    if (!projectDir || !onPlanChange) return;
    const selected = await open({
      multiple: false,
      filters:
        kind === "image"
          ? [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }]
          : [{ name: "Videos", extensions: ["mp4", "webm", "mov", "mkv"] }],
    });
    if (!selected || Array.isArray(selected)) return;
    const dest = await copySceneAsset(projectDir, sceneId, selected);
    const next: VideoPlan = {
      title: currentPlan.title,
      target_duration_sec: currentPlan.target_duration_sec,
      scenes: currentPlan.scenes.map((s) => {
        if (s.id !== sceneId) return s;
        if (kind === "video") {
          return {
            ...s,
            broll_path: dest,
            screenshot_path: undefined,
            layout: "broll" as const,
            pexels_credit: undefined,
            pexels_url: undefined,
          };
        }
        return {
          ...s,
          screenshot_path: dest,
          broll_path: undefined,
          image_fit: s.image_fit ?? "cover",
          layout: (s.layout === "broll" ? "screenshot" : s.layout ?? "screenshot") as VideoPlan["scenes"][number]["layout"],
          pexels_credit: undefined,
          pexels_url: undefined,
        };
      }),
    };
    await persist(next);
  }

  async function clearAsset(sceneId: string) {
    if (!projectDir || !onPlanChange) return;
    await clearSceneAsset(projectDir, sceneId);
    const next: VideoPlan = {
      title: currentPlan.title,
      target_duration_sec: currentPlan.target_duration_sec,
      scenes: currentPlan.scenes.map((s) =>
        s.id === sceneId
          ? {
              ...s,
              screenshot_path: undefined,
              broll_path: undefined,
              pexels_credit: undefined,
              pexels_url: undefined,
            }
          : s,
      ),
    };
    await persist(next);
  }

  return (
    <details className="group" open={canEdit || undefined}>
      <summary className="list-none">
        <Card className="cursor-pointer p-5 transition hover:bg-zinc-900/70">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <Layers3 className="h-4 w-4 text-zinc-300" />
              Scene plan
              <span className="ml-2 text-xs font-semibold text-zinc-400">
                {currentPlan.scenes.length} scenes · {currentPlan.target_duration_sec}s
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-zinc-400 transition group-open:rotate-180" />
          </div>
          <div className="mt-2 text-sm text-zinc-400">
            {canEdit
              ? "Attach an image or video per scene. Empty scenes auto-fill from Pexels when you continue."
              : "Optional details for advanced users. You can skim or ignore this section."}
          </div>
        </Card>
      </summary>

      <div className="mt-3 space-y-2">
        {currentPlan.scenes.map((s, idx) => {
          const thumb = s.screenshot_path ? toAssetSrc(s.screenshot_path) : null;
          const caption = s.caption_lines?.filter(Boolean).join(" · ");
          const hasVideo = Boolean(s.broll_path);
          const hasPexels = Boolean(
            s.pexels_credit || (s.pexels_query && !s.screenshot_path && !s.broll_path),
          );

          return (
            <Card key={s.id} className="p-4">
              <div className="flex gap-4">
                <div
                  className={cn(
                    "h-[72px] w-[128px] overflow-hidden rounded-xl border border-white/10 bg-black/40",
                    !thumb && !hasVideo ? "grid place-items-center text-xs text-zinc-500" : "",
                  )}
                >
                  {thumb ? (
                    <img src={thumb} className="h-full w-full object-cover" alt="" />
                  ) : hasVideo ? (
                    <div className="grid h-full place-items-center text-zinc-400">
                      <Video className="h-5 w-5" />
                    </div>
                  ) : (
                    "No thumbnail"
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-semibold text-zinc-100">
                      Scene {idx + 1} · {roleLabel(s.role)}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {layoutBadge(s.layout)}
                      {hasVideo ? (
                        <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                          broll
                        </span>
                      ) : null}
                      {hasPexels ? (
                        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                          pexels
                        </span>
                      ) : null}
                      <div className="text-xs font-semibold text-zinc-400">{s.duration_sec}s</div>
                    </div>
                  </div>
                  {caption ? <div className="mt-1 text-sm text-zinc-300">{caption}</div> : null}
                  {s.pexels_query ? (
                    <div className="mt-1 text-[11px] text-zinc-500">Query: {s.pexels_query}</div>
                  ) : null}
                  {s.pexels_credit ? (
                    <div className="mt-0.5 text-[11px] text-zinc-500">{s.pexels_credit}</div>
                  ) : null}
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

                  {canEdit ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <SecondaryButton
                        type="button"
                        className="rounded-xl px-3 py-2 text-xs"
                        onClick={() => void attachFile(s.id, "image")}
                      >
                        <ImagePlus className="h-3.5 w-3.5" />
                        Add image
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        className="rounded-xl px-3 py-2 text-xs"
                        onClick={() => void attachFile(s.id, "video")}
                      >
                        <Video className="h-3.5 w-3.5" />
                        Add video
                      </SecondaryButton>
                      {s.screenshot_path || s.broll_path ? (
                        <SecondaryButton
                          type="button"
                          className="rounded-xl px-3 py-2 text-xs"
                          onClick={() => void clearAsset(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Clear
                        </SecondaryButton>
                      ) : null}
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
