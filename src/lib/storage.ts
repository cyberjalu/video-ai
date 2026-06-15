import { DEFAULT_OPTIONS, type LayoutMode, type RenderOptions, type RenderPreset } from "./types";

const KEY_GEMINI = "GEMINI_API_KEY";
const KEY_PEXELS = "PEXELS_API_KEY";
const KEY_LICENSE = "CLIPNEWS_LICENSE_KEY";
const KEY_PRESET = "RENDER_PRESET";
const KEY_TEMPLATE = "RENDER_TEMPLATE";
const KEY_LAYOUT = "RENDER_LAYOUT_MODE";
const KEY_CALLOUTS = "RENDER_ENABLE_CALLOUTS";
const KEY_PROGRESS = "RENDER_ENABLE_PROGRESS";
const KEY_DUB_VOICE = "VIDEO_DUB_DEFAULT_VOICE";
const KEY_DUB_LANG = "VIDEO_DUB_DEFAULT_LANGUAGE";
const KEY_DUB_MODE = "VIDEO_DUB_ORIGINAL_AUDIO_MODE";
const KEY_DUB_DUCK = "VIDEO_DUB_DUCK_LEVEL";

export function loadGeminiKey() {
  return (localStorage.getItem(KEY_GEMINI) ?? "").trim();
}

export function saveGeminiKey(v: string) {
  localStorage.setItem(KEY_GEMINI, v.trim());
}

export function loadPexelsKey() {
  return (localStorage.getItem(KEY_PEXELS) ?? "").trim();
}

export function savePexelsKey(v: string) {
  localStorage.setItem(KEY_PEXELS, v.trim());
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

function isTemplate(v: string): v is import("./types").TemplateId {
  return v === "NewsStoryV1" || v === "CorporateNewsV1";
}

function isLayoutMode(v: string): v is LayoutMode {
  return v === "tri" || v === "dual" || v === "mono";
}

export function loadRenderOptions(): RenderOptions {
  const presetRaw = localStorage.getItem(KEY_PRESET) ?? "";
  const templateRaw = localStorage.getItem(KEY_TEMPLATE) ?? "";
  const layoutRaw = localStorage.getItem(KEY_LAYOUT) ?? "";
  const enableCalloutsRaw = localStorage.getItem(KEY_CALLOUTS);
  const enableProgressRaw = localStorage.getItem(KEY_PROGRESS);
  const dubVoice = localStorage.getItem(KEY_DUB_VOICE);
  const dubLang = localStorage.getItem(KEY_DUB_LANG);
  const dubMode = localStorage.getItem(KEY_DUB_MODE);
  const dubDuck = localStorage.getItem(KEY_DUB_DUCK);

  return {
    preset: isPreset(presetRaw) ? presetRaw : DEFAULT_OPTIONS.preset,
    template: isTemplate(templateRaw) ? templateRaw : DEFAULT_OPTIONS.template,
    layout_mode: isLayoutMode(layoutRaw) ? layoutRaw : DEFAULT_OPTIONS.layout_mode,
    enable_callouts:
      enableCalloutsRaw == null ? DEFAULT_OPTIONS.enable_callouts : enableCalloutsRaw === "true",
    enable_progress:
      enableProgressRaw == null ? DEFAULT_OPTIONS.enable_progress : enableProgressRaw === "true",
    videoDubVoice: dubVoice || DEFAULT_OPTIONS.videoDubVoice,
    videoDubLanguage: dubLang || DEFAULT_OPTIONS.videoDubLanguage,
    videoDubMode: (dubMode === "replace" || dubMode === "duck") ? dubMode : DEFAULT_OPTIONS.videoDubMode,
    videoDubDuckLevel: dubDuck ? parseFloat(dubDuck) : DEFAULT_OPTIONS.videoDubDuckLevel,
  };
}

export function saveRenderOptions(o: RenderOptions) {
  localStorage.setItem(KEY_PRESET, o.preset);
  localStorage.setItem(KEY_TEMPLATE, o.template);
  localStorage.setItem(KEY_LAYOUT, o.layout_mode);
  localStorage.setItem(KEY_CALLOUTS, String(o.enable_callouts));
  localStorage.setItem(KEY_PROGRESS, String(o.enable_progress));
  if (o.videoDubVoice) localStorage.setItem(KEY_DUB_VOICE, o.videoDubVoice);
  if (o.videoDubLanguage) localStorage.setItem(KEY_DUB_LANG, o.videoDubLanguage);
  if (o.videoDubMode) localStorage.setItem(KEY_DUB_MODE, o.videoDubMode);
  if (o.videoDubDuckLevel !== undefined) localStorage.setItem(KEY_DUB_DUCK, String(o.videoDubDuckLevel));
}

