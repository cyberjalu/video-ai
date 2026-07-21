import { useEffect, useState } from "react";
import { ChevronDown, ImagePlus, Layers3, Plus, Trash2, Video } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { VideoPlan } from "@/lib/domain/types";
import {
  MAX_SCENES,
  MIN_SCENES,
  canAddScene,
  canRemoveScene,
  clampSceneDuration,
  createBlankScene,
  roleLabel,
  sumDurations,
} from "@/lib/domain/scenePlan";
import { updatePlan, uploadSceneAsset } from "@/lib/api-client";
import { toJobAssetUrl } from "@/lib/job-utils";
import { Card } from "./Card";
import { EmptyState } from "./EmptyState";
import { SecondaryButton } from "./Buttons";

function layoutBadge(layout?: string) {
  if (!layout) return null;
  const label =
    layout === "bar_chart" ? "chart" : layout === "screenshot" ? "shot" : layout;
  return (
    <span className="rounded-full border border-[color-mix(in_srgb,var(--signal)_25%,transparent)] bg-[var(--signal-dim)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--signal)]">
      {label}
    </span>
  );
}

function SceneScriptEditor({
  sceneId,
  voiceover,
  captionLines,
  onCommit,
}: {
  sceneId: string;
  voiceover: string;
  captionLines: string[];
  onCommit: (sceneId: string, next: { voiceover: string; caption_lines: string[] }) => void;
}) {
  const captionKey = captionLines.join("\n");
  const [draftVoiceover, setDraftVoiceover] = useState(voiceover);
  const [draftCaptions, setDraftCaptions] = useState(captionKey);

  useEffect(() => {
    setDraftVoiceover(voiceover);
  }, [voiceover, sceneId]);

  useEffect(() => {
    setDraftCaptions(captionKey);
  }, [captionKey, sceneId]);

  function commit() {
    const nextVoiceover = draftVoiceover.trim();
    const nextCaptions = draftCaptions
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 2);
    const captions =
      nextCaptions.length > 0 ? nextCaptions : captionLines.length > 0 ? captionLines : [nextVoiceover.slice(0, 48) || "…"];

    const voiceChanged = nextVoiceover !== voiceover.trim();
    const captionChanged = captions.join("\n") !== captionLines.filter(Boolean).join("\n");
    if (!voiceChanged && !captionChanged) return;

    onCommit(sceneId, {
      voiceover: nextVoiceover || voiceover,
      caption_lines: captions,
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
          Voiceover / script
        </span>
        <textarea
          value={draftVoiceover}
          onChange={(e) => setDraftVoiceover(e.target.value)}
          onBlur={() => commit()}
          rows={3}
          className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm leading-relaxed text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[color-mix(in_srgb,var(--signal)_35%,transparent)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--signal)_25%,transparent)]"
          placeholder="Script for this scene…"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
          Captions <span className="font-normal normal-case tracking-normal text-[var(--ink-faint)]">(1–2 lines)</span>
        </span>
        <textarea
          value={draftCaptions}
          onChange={(e) => setDraftCaptions(e.target.value)}
          onBlur={() => commit()}
          rows={2}
          className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm leading-relaxed text-[var(--ink)] placeholder:text-[var(--ink-faint)] outline-none focus:border-[color-mix(in_srgb,var(--signal)_35%,transparent)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--signal)_25%,transparent)]"
          placeholder="On-screen caption lines…"
        />
      </label>
    </div>
  );
}

export function ScenePlanPanel({
  plan,
  editable = false,
  jobId,
  onPlanChange,
}: {
  plan?: VideoPlan | null;
  editable?: boolean;
  jobId?: string | null;
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
  const canEdit = editable && !!jobId && !!onPlanChange;

  async function persist(next: VideoPlan, options?: { invalidateTts?: boolean }) {
    if (!jobId || !onPlanChange) return;
    onPlanChange(next);
    await updatePlan(jobId, next);
    void options?.invalidateTts;
  }

  function pickFile(kind: "image" | "video"): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = kind === "image" ? "image/*" : "video/*";
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });
  }

  async function attachFile(sceneId: string, kind: "image" | "video") {
    if (!jobId || !onPlanChange) return;
    const file = await pickFile(kind);
    if (!file) return;
    const { plan: updated } = await uploadSceneAsset(jobId, sceneId, file);
    onPlanChange(updated);
  }

  async function clearAsset(sceneId: string) {
    if (!jobId || !onPlanChange) return;
    const next: VideoPlan = {
      ...currentPlan,
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

  async function commitScript(
    sceneId: string,
    nextFields: { voiceover: string; caption_lines: string[] },
  ) {
    if (!jobId || !onPlanChange) return;
    const scene = currentPlan.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    const voiceChanged = nextFields.voiceover.trim() !== scene.voiceover.trim();
    const next: VideoPlan = {
      ...currentPlan,
      scenes: currentPlan.scenes.map((s) =>
        s.id === sceneId
          ? {
              ...s,
              voiceover: nextFields.voiceover,
              caption_lines: nextFields.caption_lines,
            }
          : s,
      ),
    };
    // Stale Gemini TTS prompt would ignore edited voiceover — drop it.
    if (voiceChanged) {
      delete next.audio_prompt;
    }
    await persist(next, { invalidateTts: voiceChanged });
  }

  async function addScene() {
    if (!jobId || !onPlanChange) return;
    if (currentPlan.scenes.length >= MAX_SCENES) return;

    const scenes = [...currentPlan.scenes, createBlankScene(currentPlan.scenes)];
    const next: VideoPlan = {
      ...currentPlan,
      scenes,
      target_duration_sec: sumDurations(scenes),
    };
    delete next.audio_prompt;
    await persist(next, { invalidateTts: true });
  }

  async function removeScene(sceneId: string) {
    if (!jobId || !onPlanChange) return;
    if (currentPlan.scenes.length <= MIN_SCENES) return;

    const scenes = currentPlan.scenes.filter((s) => s.id !== sceneId);
    if (scenes.length === currentPlan.scenes.length) return;

    try {
      /* asset folder may not exist for blank scenes */
    } catch {
      /* asset folder may not exist for blank scenes */
    }

    const next: VideoPlan = {
      ...currentPlan,
      scenes,
      target_duration_sec: sumDurations(scenes),
    };
    delete next.audio_prompt;
    await persist(next, { invalidateTts: true });
  }

  async function commitDuration(sceneId: string, raw: number) {
    if (!jobId || !onPlanChange) return;
    const duration_sec = clampSceneDuration(raw);
    const scenes = currentPlan.scenes.map((s) =>
      s.id === sceneId ? { ...s, duration_sec } : s,
    );
    const next: VideoPlan = {
      ...currentPlan,
      scenes,
      target_duration_sec: sumDurations(scenes),
    };
    await persist(next);
  }

  async function commitLayout(sceneId: string, layout: VideoPlan["scenes"][number]["layout"]) {
    if (!jobId || !onPlanChange || !layout) return;
    const next: VideoPlan = {
      ...currentPlan,
      scenes: currentPlan.scenes.map((s) => (s.id === sceneId ? { ...s, layout } : s)),
    };
    await persist(next);
  }

  async function commitCallouts(sceneId: string, raw: string) {
    if (!jobId || !onPlanChange) return;
    const callouts = raw
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 3);
    const next: VideoPlan = {
      ...currentPlan,
      scenes: currentPlan.scenes.map((s) =>
        s.id === sceneId ? { ...s, callouts: callouts.length ? callouts : undefined } : s,
      ),
    };
    await persist(next);
  }

  const showAddScene = canEdit && canAddScene(currentPlan.scenes.length);
  const showRemoveScene = canEdit && canRemoveScene(currentPlan.scenes.length);

  return (
    <details className="group" open={canEdit || undefined}>
      <summary className="list-none">
        <Card className="cursor-pointer p-5 transition-all duration-200 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--signal)_20%,transparent)] hover:bg-[var(--panel-raised)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              <Layers3 className="h-4 w-4 text-[var(--signal)]/80" />
              Scene plan
              <span className="ml-2 text-xs font-semibold text-[var(--ink-muted)]">
                {currentPlan.scenes.length} scenes · {currentPlan.target_duration_sec}s
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-[var(--ink-muted)] transition group-open:rotate-180" />
          </div>
          <div className="mt-2 text-sm text-[var(--ink-muted)]">
            {canEdit
              ? "Edit voiceover, duration, scenes, and media. Empty scenes auto-fill from Pexels when you continue."
              : "Optional details for advanced users. You can skim or ignore this section."}
          </div>
        </Card>
      </summary>

      <div className="mt-3 space-y-2">
        {canEdit ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.06] bg-black/25 px-3 py-2.5">
            <div className="text-xs text-[var(--ink-faint)]">
              {currentPlan.scenes.length}/{MAX_SCENES} scenes · min {MIN_SCENES} required
            </div>
            <SecondaryButton
              type="button"
              className="rounded-xl px-3 py-2 text-xs"
              disabled={!showAddScene}
              onClick={(e) => {
                e.preventDefault();
                void addScene();
              }}
              title={
                showAddScene
                  ? "Append a new scene before voiceover"
                  : `Maximum ${MAX_SCENES} scenes`
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add scene
            </SecondaryButton>
          </div>
        ) : null}

        {currentPlan.scenes.map((s, idx) => {
          const thumb = jobId && s.screenshot_path ? toJobAssetUrl(jobId, s.screenshot_path) : null;
          const caption = s.caption_lines?.filter(Boolean).join(" · ");
          const hasVideo = Boolean(s.broll_path);
          const hasPexels = Boolean(
            s.pexels_credit || (s.pexels_query && !s.screenshot_path && !s.broll_path),
          );

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: idx * 0.035, ease: [0.22, 1, 0.36, 1] }}
            >
            <Card
              className="p-4 transition-all duration-200 hover:border-white/[0.1]"
            >
              <div className="flex gap-4">
                <div
                  className={cn(
                    "h-[72px] w-[128px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40",
                    !thumb && !hasVideo ? "grid place-items-center text-xs text-[var(--ink-faint)]" : "",
                  )}
                >
                  {thumb ? (
                    <img src={thumb} className="h-full w-full object-cover" alt="" />
                  ) : hasVideo ? (
                    <div className="grid h-full place-items-center text-[var(--ink-muted)]">
                      <Video className="h-5 w-5" />
                    </div>
                  ) : (
                    "No thumbnail"
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate text-sm font-semibold text-[var(--ink)]">
                      Scene {idx + 1} · {roleLabel(s.role)}
                      <span className="ml-1.5 font-normal text-[var(--ink-faint)]">({s.id})</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {layoutBadge(s.layout)}
                      {hasVideo ? (
                        <span className="rounded-full border border-[color-mix(in_srgb,var(--signal)_25%,transparent)] bg-[var(--signal-dim)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--signal)]">
                          broll
                        </span>
                      ) : null}
                      {hasPexels ? (
                        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                          pexels
                        </span>
                      ) : null}
                      {canEdit ? (
                        <label className="flex items-center gap-1 text-xs font-semibold text-[var(--ink-muted)]">
                          <input
                            type="number"
                            min={3}
                            max={12}
                            value={s.duration_sec}
                            onChange={(e) => {
                              const v = Number(e.currentTarget.value);
                              if (Number.isFinite(v)) void commitDuration(s.id, v);
                            }}
                            className="w-10 rounded-lg border border-white/10 bg-black/40 px-1.5 py-0.5 text-center text-[var(--ink)] outline-none focus:border-[color-mix(in_srgb,var(--signal)_35%,transparent)]"
                            aria-label={`Duration for scene ${idx + 1}`}
                          />
                          s
                        </label>
                      ) : (
                        <div className="text-xs font-semibold text-[var(--ink-muted)]">{s.duration_sec}s</div>
                      )}
                      {showRemoveScene ? (
                        <SecondaryButton
                          type="button"
                          className="rounded-lg px-2 py-1.5 text-xs text-[var(--ink-muted)] hover:text-red-300"
                          title="Remove scene"
                          aria-label={`Remove scene ${idx + 1}`}
                          onClick={(e) => {
                            e.preventDefault();
                            void removeScene(s.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </SecondaryButton>
                      ) : null}
                    </div>
                  </div>

                  {canEdit ? (
                    <SceneScriptEditor
                      sceneId={s.id}
                      voiceover={s.voiceover}
                      captionLines={s.caption_lines ?? []}
                      onCommit={(id, fields) => void commitScript(id, fields)}
                    />
                  ) : (
                    <>
                      {caption ? <div className="mt-1 text-sm text-[var(--ink-muted)]">{caption}</div> : null}
                      {s.voiceover ? (
                        <div className="mt-1 line-clamp-2 text-sm text-[var(--ink-muted)]">{s.voiceover}</div>
                      ) : null}
                    </>
                  )}

                  {s.pexels_query ? (
                    <div className="mt-1 text-[11px] text-[var(--ink-faint)]">Query: {s.pexels_query}</div>
                  ) : null}
                  {s.pexels_credit ? (
                    <div className="mt-0.5 text-[11px] text-[var(--ink-faint)]">{s.pexels_credit}</div>
                  ) : null}
                  {s.callouts?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.callouts.slice(0, 2).map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-[var(--ink)]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {canEdit ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
                          Visual layout
                        </span>
                        <select
                          value={s.layout ?? "screenshot"}
                          onChange={(e) =>
                            void commitLayout(
                              s.id,
                              e.currentTarget.value as VideoPlan["scenes"][number]["layout"],
                            )
                          }
                          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[color-mix(in_srgb,var(--signal)_35%,transparent)]"
                        >
                          <option value="screenshot">Screenshot</option>
                          <option value="big_callout">Big callout</option>
                          <option value="stat">Stat card</option>
                          <option value="split">Split compare</option>
                          <option value="broll">B-roll video</option>
                          <option value="bar_chart">Bar chart</option>
                        </select>
                      </label>
                      <label className="grid gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
                          Callout chips
                        </span>
                        <input
                          type="text"
                          defaultValue={(s.callouts ?? []).join(", ")}
                          key={`${s.id}-${(s.callouts ?? []).join("|")}`}
                          onBlur={(e) => void commitCallouts(s.id, e.currentTarget.value)}
                          placeholder="e.g. 10x faster, $2B"
                          className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[color-mix(in_srgb,var(--signal)_35%,transparent)]"
                        />
                      </label>
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
            </motion.div>
          );
        })}

        {showAddScene ? (
          <button
            type="button"
            onClick={() => void addScene()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--signal)_30%,transparent)] bg-[var(--signal-dim)] px-4 py-3.5 text-sm font-semibold text-[var(--signal)] transition-all duration-200 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--signal)_40%,transparent)] hover:brightness-110 active:translate-y-0"
          >
            <Plus className="h-4 w-4" />
            Add scene
          </button>
        ) : null}
      </div>
    </details>
  );
}
