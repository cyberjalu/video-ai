/**
 * Gemini TTS prebuilt voices from:
 * https://ai.google.dev/gemini-api/docs/speech-generation#languages
 */
export const GEMINI_TTS_VOICES = [
  { name: "Zephyr", style: "Bright" },
  { name: "Puck", style: "Upbeat" },
  { name: "Charon", style: "Informative" },
  { name: "Kore", style: "Firm" },
  { name: "Fenrir", style: "Excitable" },
  { name: "Leda", style: "Youthful" },
  { name: "Orus", style: "Firm" },
  { name: "Aoede", style: "Breezy" },
  { name: "Callirrhoe", style: "Easy-going" },
  { name: "Autonoe", style: "Bright" },
  { name: "Enceladus", style: "Breathy" },
  { name: "Iapetus", style: "Clear" },
  { name: "Umbriel", style: "Easy-going" },
  { name: "Algieba", style: "Smooth" },
  { name: "Despina", style: "Smooth" },
  { name: "Erinome", style: "Clear" },
  { name: "Algenib", style: "Gravelly" },
  { name: "Rasalgethi", style: "Informative" },
  { name: "Laomedeia", style: "Upbeat" },
  { name: "Achernar", style: "Soft" },
  { name: "Alnilam", style: "Firm" },
  { name: "Schedar", style: "Even" },
  { name: "Gacrux", style: "Mature" },
  { name: "Pulcherrima", style: "Forward" },
  { name: "Achird", style: "Friendly" },
  { name: "Zubenelgenubi", style: "Casual" },
  { name: "Vindemiatrix", style: "Gentle" },
  { name: "Sadachbia", style: "Lively" },
  { name: "Sadaltager", style: "Knowledgeable" },
  { name: "Sulafat", style: "Warm" },
] as const;

export type GeminiTtsVoiceName = (typeof GEMINI_TTS_VOICES)[number]["name"];

export const DEFAULT_GEMINI_TTS_VOICE: GeminiTtsVoiceName = "Zephyr";

const VOICE_NAME_SET = new Set<string>(GEMINI_TTS_VOICES.map((v) => v.name));

export function isGeminiTtsVoice(name: string): name is GeminiTtsVoiceName {
  return VOICE_NAME_SET.has(name);
}

/** Normalize a saved / free-text voice to a known Gemini TTS name. */
export function resolveGeminiTtsVoice(name: string | undefined | null): GeminiTtsVoiceName {
  if (name && isGeminiTtsVoice(name)) return name;
  return DEFAULT_GEMINI_TTS_VOICE;
}
