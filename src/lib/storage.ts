import { DEFAULT_OPTIONS, type LayoutMode, type RenderOptions, type RenderPreset } from "./types";

const KEY_GEMINI = "GEMINI_API_KEY";
const KEY_LICENSE = "CLIPNEWS_LICENSE_KEY";
const KEY_PRESET = "RENDER_PRESET";
const KEY_LAYOUT = "RENDER_LAYOUT_MODE";
const KEY_CALLOUTS = "RENDER_ENABLE_CALLOUTS";
const KEY_PROGRESS = "RENDER_ENABLE_PROGRESS";

export function loadGeminiKey() {
  return (localStorage.getItem(KEY_GEMINI) ?? "").trim();
}

export function saveGeminiKey(v: string) {
  localStorage.setItem(KEY_GEMINI, v.trim());
}

export function loadLicenseKey() {
  return (localStorage.getItem(KEY_LICENSE) ?? "").trim();
}

export function saveLicenseKey(v: string) {
  localStorage.setItem(KEY_LICENSE, v.trim());
}

function isPreset(v: string): v is RenderPreset {
  return v === "deep_explainer" || v === "news_60_80" || v === "ultra_25_35";
}

function isLayoutMode(v: string): v is LayoutMode {
  return v === "tri" || v === "dual" || v === "mono";
}

export function loadRenderOptions(): RenderOptions {
  const presetRaw = localStorage.getItem(KEY_PRESET) ?? "";
  const layoutRaw = localStorage.getItem(KEY_LAYOUT) ?? "";
  const enableCalloutsRaw = localStorage.getItem(KEY_CALLOUTS);
  const enableProgressRaw = localStorage.getItem(KEY_PROGRESS);

  return {
    preset: isPreset(presetRaw) ? presetRaw : DEFAULT_OPTIONS.preset,
    layout_mode: isLayoutMode(layoutRaw) ? layoutRaw : DEFAULT_OPTIONS.layout_mode,
    enable_callouts:
      enableCalloutsRaw == null ? DEFAULT_OPTIONS.enable_callouts : enableCalloutsRaw === "true",
    enable_progress:
      enableProgressRaw == null ? DEFAULT_OPTIONS.enable_progress : enableProgressRaw === "true",
  };
}

export function saveRenderOptions(o: RenderOptions) {
  localStorage.setItem(KEY_PRESET, o.preset);
  localStorage.setItem(KEY_LAYOUT, o.layout_mode);
  localStorage.setItem(KEY_CALLOUTS, String(o.enable_callouts));
  localStorage.setItem(KEY_PROGRESS, String(o.enable_progress));
}

