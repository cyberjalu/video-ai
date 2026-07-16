import { describe, expect, it } from "vitest";
import {
  MAX_SCENES,
  MIN_SCENES,
  canAddScene,
  canRemoveScene,
  clampSceneDuration,
  createBlankScene,
  nextSceneId,
  sumDurations,
} from "./scenePlan";
import type { VideoPlan } from "./types";

function scene(id: string, duration_sec: number): VideoPlan["scenes"][number] {
  return {
    id,
    role: "context",
    duration_sec,
    caption_lines: ["a"],
    voiceover: "v",
    layout: "big_callout",
  };
}

describe("scenePlan helpers", () => {
  it("generates unique scene ids", () => {
    const scenes = [scene("s1", 5), scene("s2", 5), scene("s4", 5)];
    expect(nextSceneId(scenes)).toBe("s3");
    expect(nextSceneId([...scenes, scene("s3", 5)])).toBe("s5");
  });

  it("clamps scene duration to worker bounds", () => {
    expect(clampSceneDuration(2)).toBe(3);
    expect(clampSceneDuration(20)).toBe(12);
    expect(clampSceneDuration(6.7)).toBe(7);
  });

  it("sums durations with min/max target bounds", () => {
    expect(sumDurations([scene("s1", 2), scene("s2", 2)])).toBe(20);
    expect(sumDurations([scene("s1", 8), scene("s2", 8), scene("s3", 8)])).toBe(24);
  });

  it("creates a blank scene with defaults", () => {
    const blank = createBlankScene([scene("s1", 5)]);
    expect(blank.id).toBe("s2");
    expect(blank.voiceover).toContain("voiceover");
    expect(blank.pexels_query).toBeTruthy();
    expect(blank.duration_sec).toBeGreaterThanOrEqual(3);
    expect(blank.duration_sec).toBeLessThanOrEqual(12);
  });

  it("enforces min/max scene counts", () => {
    expect(canAddScene(MIN_SCENES)).toBe(true);
    expect(canAddScene(MAX_SCENES)).toBe(false);
    expect(canRemoveScene(MIN_SCENES)).toBe(false);
    expect(canRemoveScene(MIN_SCENES + 1)).toBe(true);
  });
});
