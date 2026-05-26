import type { GenerationStatus, WorkerEvent, WorkerStep } from "./types";

export type UiStepId =
  | "reading_article"
  | "capturing_screenshots"
  | "writing_script"
  | "generating_voiceover"
  | "rendering_video"
  | "finalizing_export";

export type UiStepState = "pending" | "running" | "completed" | "failed";

export type UiStep = {
  id: UiStepId;
  label: string;
  state: UiStepState;
  detail?: string;
};

export const UI_STEP_ORDER: Array<{ id: UiStepId; label: string; worker: WorkerStep[] }> = [
  { id: "reading_article", label: "Reading article", worker: ["extract"] },
  { id: "capturing_screenshots", label: "Capturing screenshots", worker: ["screenshot"] },
  { id: "writing_script", label: "Writing video script", worker: ["plan", "plan_rewrite", "fetch_broll"] },
  { id: "generating_voiceover", label: "Generating voiceover", worker: ["tts", "audio_fit"] },
  { id: "rendering_video", label: "Rendering video", worker: ["render"] },
  { id: "finalizing_export", label: "Finalizing export", worker: ["qc"] },
];

export function statusFromUiStepId(id: UiStepId): GenerationStatus {
  return id;
}

export function initialSteps(): UiStep[] {
  return UI_STEP_ORDER.map((s) => ({ id: s.id, label: s.label, state: "pending" }));
}

export function findUiStepIdFromWorkerStep(step: WorkerStep): UiStepId | null {
  const hit = UI_STEP_ORDER.find((s) => s.worker.includes(step));
  return hit?.id ?? null;
}

export function deriveProgressPercent(steps: UiStep[]) {
  const done = steps.filter((s) => s.state === "completed").length;
  const total = steps.length;
  return total ? Math.round((done / total) * 100) : 0;
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

  if (e.type === "done") {
    const next = steps.map((s) =>
      s.state === "completed"
        ? s
        : s.state === "failed"
          ? s
          : { ...s, state: "completed" as UiStepState },
    );
    return { steps: next, status: "completed" };
  }

  if (e.type === "step_start") {
    const id = findUiStepIdFromWorkerStep(e.step);
    if (!id) return { steps };

    const next = steps.map((s): UiStep => {
      if (s.id === id) return { ...s, state: "running" };
      if (s.state === "running") return { ...s, state: "completed" };
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
  const msg = raw.toLowerCase();
  if (msg.includes("paywall") || msg.includes("403") || msg.includes("blocked")) {
    return "We couldn’t read this article. Try another URL or check if the page is behind a paywall.";
  }
  if (msg.includes("screenshot")) {
    return "Screenshot capture failed. The site may block automated browsing.";
  }
  if (msg.includes("tts") || msg.includes("voice")) {
    return "Voice generation failed. Please try again.";
  }
  if (msg.includes("permission") || msg.includes("eacces")) {
    return "Render failed. Check output folder permissions.";
  }
  return "Something went wrong while generating your video. Please try again.";
}

