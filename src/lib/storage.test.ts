import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => store.clear(),
});

describe("storage", () => {
  beforeEach(() => {
    store.clear();
  });

  it("persists voice and models roundtrip", async () => {
    const { saveRenderOptions, loadRenderOptions } = await import("./storage");
    saveRenderOptions({
      preset: "news_60_80",
      template: "YouTubeStoryV1",
      enable_callouts: false,
      enable_progress: true,
      layout_mode: "dual",
      voice: "Charon",
      contentModel: "gemini-3.1-flash-lite",
      audioModel: "gemini-2.5-flash-preview-tts",
    });
    const loaded = loadRenderOptions();
    expect(loaded.preset).toBe("news_60_80");
    expect(loaded.template).toBe("YouTubeStoryV1");
    expect(loaded.layout_mode).toBe("dual");
    expect(loaded.enable_callouts).toBe(false);
    expect(loaded.voice).toBe("Charon");
    expect(loaded.contentModel).toBe("gemini-3.1-flash-lite");
    expect(loaded.audioModel).toBe("gemini-2.5-flash-preview-tts");
  });
});
