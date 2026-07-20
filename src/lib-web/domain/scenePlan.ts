import type { VideoPlan } from "./types";

export const MIN_SCENES = 4;
export const MAX_SCENES = 12;
export const MAX_TARGET_DURATION_SEC = 180;
export const MIN_SCENE_DURATION_SEC = 3;
export const MAX_SCENE_DURATION_SEC = 12;

export type Scene = VideoPlan["scenes"][number];

const ROLE_LABELS: Record<string, string> = {
  hook: "Hook",
  re_hook: "Re-hook",
  why_matters: "Why it matters",
  what_happened: "What happened",
  evidence: "Proof",
  context: "Context",
  impact: "Impact",
  takeaway: "CTA",
};

export function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

export function nextSceneId(scenes: Scene[]): string {
  const used = new Set(
    scenes
      .map((s) => {
        const m = /^s(\d+)$/i.exec(s.id);
        return m ? Number(m[1]) : NaN;
      })
      .filter((n) => Number.isFinite(n)),
  );
  let n = 1;
  while (used.has(n)) n += 1;
  return `s${n}`;
}

export function pickSceneRole(scenes: Scene[]): string {
  const counts = new Map<string, number>();
  for (const s of scenes) {
    counts.set(s.role, (counts.get(s.role) ?? 0) + 1);
  }
  const preferred = ["context", "evidence", "what_happened", "why_matters", "impact", "re_hook"];
  for (const role of preferred) {
    if ((counts.get(role) ?? 0) === 0) return role;
  }
  return preferred.reduce((best, role) =>
    (counts.get(role) ?? 0) < (counts.get(best) ?? 0) ? role : best,
  );
}

export function clampSceneDuration(durationSec: number) {
  return Math.max(MIN_SCENE_DURATION_SEC, Math.min(MAX_SCENE_DURATION_SEC, Math.round(durationSec)));
}

export function sumDurations(scenes: Scene[]): number {
  const total = scenes.reduce((sum, s) => sum + (s.duration_sec || 0), 0);
  return Math.max(20, Math.min(MAX_TARGET_DURATION_SEC, Math.round(total)));
}

export function createBlankScene(scenes: Scene[]): Scene {
  const id = nextSceneId(scenes);
  const role = pickSceneRole(scenes);
  const duration_sec = clampSceneDuration(5 + (scenes.length % 4));
  return {
    id,
    role,
    duration_sec,
    caption_lines: ["New scene", "Edit this caption"],
    voiceover: "Write the voiceover for this scene…",
    layout: "big_callout",
    callouts: ["Key point"],
    pexels_query: "news studio",
  };
}

export function canAddScene(sceneCount: number) {
  return sceneCount < MAX_SCENES;
}

export function canRemoveScene(sceneCount: number) {
  return sceneCount > MIN_SCENES;
}

/** Roles that receive accent caption styling in Remotion chrome. */
export const VIRAL_ACCENT_ROLES = new Set(["hook", "re_hook", "takeaway"]);

export function isViralAccentRole(role: string) {
  return VIRAL_ACCENT_ROLES.has(role);
}

export function clampHookDuration(durationSec: number) {
  return Math.min(clampSceneDuration(durationSec), 5);
}

export function clampViralTargetDuration(durationSec: number) {
  return Math.max(30, Math.min(45, Math.round(durationSec)));
}
