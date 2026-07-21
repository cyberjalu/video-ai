import type { GenerationStatus, WorkerEvent, WorkerStep } from "./types";

export type UiStepId =
  | "reading_article"
  | "capturing_screenshots"
  | "writing_script"
  | "awaiting_assets"
  | "generating_voiceover"
  | "rendering_video"
  | "finalizing_export"
  | "extracting_audio"
  | "transcribing"
  | "transcript_ready"
  | "merging_audio";

export type UiStepState = "pending" | "running" | "completed" | "failed";

export type UiStep = {
  id: UiStepId;
  label: string;
  state: UiStepState;
  detail?: string;
};

export const UI_STEP_ORDER: Array<{ id: UiStepId; label: string; worker: WorkerStep[]; detail?: string }> = [
  { id: "reading_article", label: "Reading article", worker: ["extract"] },
  { id: "capturing_screenshots", label: "Capturing screenshots", worker: ["screenshot"] },
  { id: "writing_script", label: "Writing video script", worker: ["plan", "plan_rewrite"] },
  { id: "awaiting_assets", label: "Script & visuals", worker: [], detail: "Edit voiceover, add scenes, attach media" },
  { id: "generating_voiceover", label: "Generating voiceover", worker: ["tts", "audio_fit", "fetch_broll"] },
  { id: "rendering_video", label: "Rendering video", worker: ["render"] },
  { id: "finalizing_export", label: "Finalizing export", worker: ["qc"] },
];

export function statusFromUiStepId(id: UiStepId): GenerationStatus {
  if (
    id === "extracting_audio" ||
    id === "transcribing" ||
    id === "transcript_ready" ||
    id === "merging_audio"
  ) {
    return "generating_voiceover";
  }
  return id;
}

export function initialSteps(): UiStep[] {
  return UI_STEP_ORDER.map((s) => ({
    id: s.id,
    label: s.label,
    state: "pending",
    detail: "detail" in s ? s.detail : undefined,
  }));
}

export function findUiStepIdFromWorkerStep(step: WorkerStep): UiStepId | null {
  const hit = UI_STEP_ORDER.find((s) => s.worker.includes(step));
  return hit?.id ?? null;
}

export function deriveProgressPercent(steps: UiStep[], opts?: { runningElapsedMs?: number }) {
  const total = steps.length;
  if (!total) return 0;
  if (steps.every((s) => s.state === "completed")) return 100;

  const done = steps.filter((s) => s.state === "completed").length;
  const running = steps.some((s) => s.state === "running");
  const slice = 100 / total;
  let p = done * slice;
  if (running) {
    const creep = opts?.runningElapsedMs
      ? Math.min(slice * 0.42, (opts.runningElapsedMs / 90_000) * slice * 0.42)
      : slice * 0.35;
    p += creep;
  }
  return Math.min(99, Math.round(p));
}

/** Rebuild UI steps from persisted job status (page reload / reconnect). */
export function hydrateStepsFromJob(opts: {
  status: string;
  stage?: string | null;
  hasPlan: boolean;
}): UiStep[] {
  const steps = initialSteps();
  const { status, hasPlan } = opts;

  if (status === "completed") {
    return steps.map((s) => ({ ...s, state: "completed" as UiStepState }));
  }

  if (status === "awaiting_review") {
    return steps.map((s): UiStep => {
      if (
        s.id === "reading_article" ||
        s.id === "capturing_screenshots" ||
        s.id === "writing_script"
      ) {
        return { ...s, state: "completed" };
      }
      if (s.id === "awaiting_assets") return { ...s, state: "running" };
      return s;
    });
  }

  if (status === "planning" || status === "queued") {
    return steps.map((s, i) =>
      i === 0 ? { ...s, state: "running" as UiStepState, detail: "Working…" } : s,
    );
  }

  if (status === "rendering") {
    return steps.map((s): UiStep => {
      if (
        s.id === "reading_article" ||
        s.id === "capturing_screenshots" ||
        s.id === "writing_script" ||
        s.id === "awaiting_assets"
      ) {
        return { ...s, state: "completed" };
      }
      if (s.id === "generating_voiceover") {
        return { ...s, state: "running", detail: "Rendering…" };
      }
      return s;
    });
  }

  if (status === "failed") {
    if (hasPlan) {
      return steps.map((s): UiStep => {
        if (
          s.id === "reading_article" ||
          s.id === "capturing_screenshots" ||
          s.id === "writing_script" ||
          s.id === "awaiting_assets"
        ) {
          return { ...s, state: "completed" };
        }
        if (s.id === "generating_voiceover" || s.id === "rendering_video") {
          return { ...s, state: "failed" };
        }
        return s;
      });
    }
    return steps.map((s, i): UiStep => {
      if (i === 0) return { ...s, state: "failed" };
      return s;
    });
  }

  return steps;
}

/** Optimistic UI reset when user hits Continue after cancel/fail. */
export function resetStepsForContinue(hasPlan: boolean): UiStep[] {
  if (hasPlan) {
    return initialSteps().map((s): UiStep => {
      if (
        s.id === "reading_article" ||
        s.id === "capturing_screenshots" ||
        s.id === "writing_script" ||
        s.id === "awaiting_assets"
      ) {
        return { ...s, state: "completed" };
      }
      if (s.id === "generating_voiceover") {
        return { ...s, state: "running", detail: "Resuming render…" };
      }
      return s;
    });
  }
  return initialSteps().map((s, i): UiStep =>
    i === 0 ? { ...s, state: "running", detail: "Restarting plan…" } : s,
  );
}

export function applyWorkerEventToSteps(
  steps: UiStep[],
  e: WorkerEvent,
): { steps: UiStep[]; status?: GenerationStatus } {
  if (e.type === "error") {
    const next = steps.map((s) =>
      s.state === "running" ? { ...s, state: "failed" as UiStepState } : s,
    );
    return { steps: next, status: "failed" };
  }

  if (e.type === "log") {
    const next = steps.map((s) =>
      s.state === "running" ? { ...s, detail: e.message } : s,
    );
    return { steps: next };
  }

  if (e.type === "done") {
    if (e.planReady) {
      const next = steps.map((s): UiStep => {
        if (s.id === "awaiting_assets") return { ...s, state: "running" };
        if (
          s.id === "reading_article" ||
          s.id === "capturing_screenshots" ||
          s.id === "writing_script"
        ) {
          return { ...s, state: "completed" };
        }
        if (s.state === "running") return { ...s, state: "completed" };
        return s;
      });
      return { steps: next, status: "awaiting_assets" };
    }
    const next = steps.map((s) =>
      s.state === "completed"
        ? s
        : s.state === "failed"
          ? s
          : { ...s, state: "completed" as UiStepState },
    );
    return { steps: next, status: "completed" };
  }

  if (e.type === "plan_ready") {
    const next = steps.map((s): UiStep => {
      if (s.id === "awaiting_assets") return { ...s, state: "running" };
      if (
        s.id === "reading_article" ||
        s.id === "capturing_screenshots" ||
        s.id === "writing_script"
      ) {
        return { ...s, state: "completed" };
      }
      if (s.state === "running") return { ...s, state: "completed" };
      return s;
    });
    return { steps: next, status: "awaiting_assets" };
  }

  if (e.type === "step_start") {
    const id = findUiStepIdFromWorkerStep(e.step);
    if (!id) return { steps };

    const next = steps.map((s): UiStep => {
      if (s.id === id) return { ...s, state: "running", detail: undefined };
      if (s.state === "running") return { ...s, state: "completed" };
      if (s.state === "failed") return { ...s, state: "pending" };
      return s;
    });
    return { steps: next, status: statusFromUiStepId(id) };
  }

  if (e.type === "step_done") {
    const id = findUiStepIdFromWorkerStep(e.step);
    if (!id) return { steps };

    const next = steps.map((s): UiStep => (s.id === id ? { ...s, state: "completed" } : s));
    return { steps: next };
  }

  return { steps };
}

export function friendlyErrorMessage(raw: string) {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "Something went wrong while generating your video. Please try again.";

  const msg = trimmed.toLowerCase();
  if (
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("too many requests")
  ) {
    return "API rate limit hit. Wait a moment, then press Continue to resume.";
  }
  if (msg.includes("cancelled by user")) {
    return "Cancelled. Press Continue to resume from where you left off.";
  }
  if (msg.includes("paywall") || msg.includes("403") || msg.includes("blocked")) {
    return "We couldn’t read this article. Try another URL or check if the page is behind a paywall.";
  }
  if (msg.includes("missing required binary") || msg.includes("ffmpeg") || msg.includes("ffprobe")) {
    return trimmed;
  }
  if (msg.includes("screenshot")) {
    return "Screenshot capture failed. The site may block automated browsing.";
  }
  if (msg.includes("gemini api") || msg.includes("api key") || msg.includes("thiếu gemini")) {
    return trimmed;
  }
  if (msg.includes("permission") || msg.includes("eacces")) {
    return "Render failed. Check output folder permissions.";
  }
  // Prefer the worker's concrete message for debugging / OSS users.
  if (trimmed.length <= 280 && !msg.includes("worker exited with code")) {
    return trimmed;
  }
  return trimmed.length > 280 ? `${trimmed.slice(0, 280)}…` : trimmed;
}

/** Map dub worker step names → UI stepper ids */
export const DUB_WORKER_TO_UI: Record<string, UiStepId> = {
  extract_original_audio: "extracting_audio",
  transcribe_original: "transcribing",
  generate_dub_tts: "generating_voiceover",
  merge_dub_video: "merging_audio",
};

