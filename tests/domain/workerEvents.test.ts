import { describe, expect, it } from "vitest";
import { parseWorkerEventLine } from "@/lib/domain/workerEvents";

describe("parseWorkerEventLine", () => {
  it("parses valid JSON worker events", () => {
    const e = parseWorkerEventLine('{"type":"step_start","step":"extract"}');
    expect(e).toEqual({ type: "step_start", step: "extract" });
  });

  it("parses done events", () => {
    const e = parseWorkerEventLine(
      '{"type":"done","projectDir":"/tmp/out","mp4":"/tmp/out/render/out.mp4"}',
    );
    expect(e?.type).toBe("done");
  });

  it("returns null for plain log lines", () => {
    expect(parseWorkerEventLine("not json")).toBeNull();
    expect(parseWorkerEventLine("{incomplete")).toBeNull();
  });

  it("returns null for JSON without type", () => {
    expect(parseWorkerEventLine('{"step":"extract"}')).toBeNull();
  });
});
