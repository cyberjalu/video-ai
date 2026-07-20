import { describe, expect, it } from "vitest";
import {
  applyWorkerEventToSteps,
  DUB_WORKER_TO_UI,
  findUiStepIdFromWorkerStep,
  friendlyErrorMessage,
  initialSteps,
} from "@/lib/domain/generation";

describe("generation helpers", () => {
  it("maps worker steps to UI steps", () => {
    expect(findUiStepIdFromWorkerStep("extract")).toBe("reading_article");
    expect(findUiStepIdFromWorkerStep("tts")).toBe("generating_voiceover");
    expect(findUiStepIdFromWorkerStep("qc")).toBe("finalizing_export");
  });

  it("maps dub worker steps to UI ids", () => {
    expect(DUB_WORKER_TO_UI.extract_original_audio).toBe("extracting_audio");
    expect(DUB_WORKER_TO_UI.merge_dub_video).toBe("merging_audio");
  });

  it("updates stepper on step_start / step_done", () => {
    let steps = initialSteps();
    ({ steps } = applyWorkerEventToSteps(steps, { type: "step_start", step: "extract" }));
    expect(steps[0].state).toBe("running");
    ({ steps } = applyWorkerEventToSteps(steps, { type: "step_done", step: "extract" }));
    expect(steps[0].state).toBe("completed");
  });

  it("marks running steps failed on error", () => {
    let steps = initialSteps();
    ({ steps } = applyWorkerEventToSteps(steps, { type: "step_start", step: "plan" }));
    const result = applyWorkerEventToSteps(steps, { type: "error", message: "boom" });
    expect(result.status).toBe("failed");
    expect(result.steps.some((s) => s.state === "failed")).toBe(true);
  });

  it("prefers concrete ffmpeg errors", () => {
    const msg = 'Missing required binary "ffmpeg" on PATH. Install with Homebrew.';
    expect(friendlyErrorMessage(msg)).toBe(msg);
  });

  it("enters awaiting_assets on plan_ready", () => {
    let steps = initialSteps();
    ({ steps } = applyWorkerEventToSteps(steps, { type: "step_start", step: "plan" }));
    const result = applyWorkerEventToSteps(steps, {
      type: "plan_ready",
      projectDir: "/tmp/out",
      plan: { title: "t", target_duration_sec: 60, scenes: [] },
    });
    expect(result.status).toBe("awaiting_assets");
    expect(result.steps.find((s) => s.id === "awaiting_assets")?.state).toBe("running");
    expect(result.steps.find((s) => s.id === "writing_script")?.state).toBe("completed");
  });
});
