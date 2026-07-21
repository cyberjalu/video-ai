/**
 * Free-tier Gemini model choices exposed in Settings.
 * Content = plan / script; Audio = TTS.
 */

export const GEMINI_CONTENT_MODELS = [
  { id: "gemini-3.5-flash", label: "gemini-3.5-flash" },
  { id: "gemini-3.1-flash-lite", label: "gemini-3.1-flash-lite" },
  { id: "gemini-3-flash-preview", label: "gemini-3-flash-preview" },
  { id: "gemini-2.5-pro", label: "gemini-2.5-pro" },
  { id: "gemini-2.5-flash", label: "gemini-2.5-flash" },
  { id: "gemini-2.5-flash-lite", label: "gemini-2.5-flash-lite" },
] as const;

export const GEMINI_AUDIO_MODELS = [
  { id: "gemini-2.5-flash-preview-tts", label: "gemini-2.5-flash-preview-tts" },
  { id: "gemini-3.1-flash-tts-preview", label: "gemini-3.1-flash-tts-preview" },
] as const;

export type GeminiContentModelId = (typeof GEMINI_CONTENT_MODELS)[number]["id"];
export type GeminiAudioModelId = (typeof GEMINI_AUDIO_MODELS)[number]["id"];

export const DEFAULT_GEMINI_CONTENT_MODEL: GeminiContentModelId = "gemini-3.5-flash";
export const DEFAULT_GEMINI_AUDIO_MODEL: GeminiAudioModelId = "gemini-3.1-flash-tts-preview";

const CONTENT_SET = new Set<string>(GEMINI_CONTENT_MODELS.map((m) => m.id));
const AUDIO_SET = new Set<string>(GEMINI_AUDIO_MODELS.map((m) => m.id));

export function resolveGeminiContentModel(id: string | undefined | null): GeminiContentModelId {
  if (id && CONTENT_SET.has(id)) return id as GeminiContentModelId;
  return DEFAULT_GEMINI_CONTENT_MODEL;
}

export function resolveGeminiAudioModel(id: string | undefined | null): GeminiAudioModelId {
  if (id && AUDIO_SET.has(id)) return id as GeminiAudioModelId;
  return DEFAULT_GEMINI_AUDIO_MODEL;
}
