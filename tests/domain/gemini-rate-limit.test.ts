import { describe, expect, it } from "vitest";
import {
  computeGeminiWaitMs,
  isGeminiRateLimitError,
} from "@/server/gemini/rate-limit";

describe("gemini rate limit helpers", () => {
  it("waits when RPM window is full", () => {
    const now = 1_000_000;
    const rpm = 10;
    const stamps = Array.from({ length: 10 }, (_, i) => now - 5_000 + i * 10);
    const wait = computeGeminiWaitMs(stamps, now, rpm, 0);
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(60_000);
  });

  it("enforces min gap between calls", () => {
    const now = 1_000_000;
    const wait = computeGeminiWaitMs([now - 1_000], now, 10, 6_000);
    expect(wait).toBeGreaterThanOrEqual(4_900);
    expect(wait).toBeLessThanOrEqual(5_100);
  });

  it("allows a call when under RPM and past gap", () => {
    const now = 1_000_000;
    const wait = computeGeminiWaitMs([now - 10_000], now, 10, 6_000);
    expect(wait).toBe(0);
  });

  it("detects rate-limit errors", () => {
    expect(isGeminiRateLimitError(new Error("429 RESOURCE_EXHAUSTED"))).toBe(true);
    expect(isGeminiRateLimitError(new Error("Too Many Requests"))).toBe(true);
    expect(isGeminiRateLimitError(new Error("parse failed"))).toBe(false);
  });
});
