import { GoogleGenAI } from "@google/genai";
import type { GenerationRequest, VideoPlan } from "@/lib/domain/types";

export {
  runCraftQc,
  runCraftQcHeuristics,
  buildCraftRewriteAppendix,
  craftModeForPreset,
  distillBeats,
  type CraftReport,
  type CraftCriterionId,
  type CraftCriterionResult,
  type StoryBeat,
  type CraftQcOptions,
} from "./craft";

export type ViralTone = "news" | "drama" | "data";

export type ViralBrief = {
  tone: ViralTone;
  hookAngle: string;
  controversy?: string;
  keyStat?: string;
  cta: string;
  enhancedPrompt: string;
};

export type CaptionPack = {
  title: string;
  description: string;
  hashtags: string[];
  postingTimeHint: string;
  fullCaption: string;
};

export type ViralQcResult = {
  pass: boolean;
  score: number;
  reasons: string[];
};

function detectTone(request: GenerationRequest): ViralTone {
  const preset = request.options?.preset;
  if (preset === "viral_30_45" || request.templateId === "viral-fast") return "drama";
  if (request.templateId === "corporate-brief") return "data";
  return "news";
}

export async function generateViralBrief(request: GenerationRequest): Promise<ViralBrief | null> {
  const gemini = request.keys.gemini?.trim();
  if (!gemini) return null;

  const topic =
    request.input.prompt ??
    request.input.url ??
    request.input.script?.slice(0, 500) ??
    "general news topic";

  const tone = detectTone(request);
  const ai = new GoogleGenAI({ apiKey: gemini });
  const model = request.options.contentModel ?? "gemini-3.5-flash";

  const prompt = `You are a TikTok viral content strategist and short-form director. Tone: ${tone}.
Topic: ${topic}

Return ONLY JSON:
{
  "hookAngle": "one-line scroll-stopping hook with a SPECIFIC situation, number, or named failure — not a generic question",
  "controversy": "optional tension angle or empty string",
  "keyStat": "optional striking number/fact from the topic or empty string — NEVER invent numbers",
  "cta": "end CTA = clear action + short reason tied to the story",
  "enhancedPrompt": "2-4 sentence brief for a video writer: specific hook, escalating re-hook (new angle), proof beats, conversational voice (no brochure slogans), CTA with reason, FYP pacing"
}`;

  const res = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  const text = res.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const parsed = JSON.parse(match[0]) as Omit<ViralBrief, "tone" | "enhancedPrompt"> & {
    enhancedPrompt?: string;
  };

  const enhancedPrompt =
    parsed.enhancedPrompt ??
    `Make a viral TikTok about: ${topic}. Hook: ${parsed.hookAngle}. CTA: ${parsed.cta}.`;

  return {
    tone,
    hookAngle: parsed.hookAngle ?? "",
    controversy: parsed.controversy || undefined,
    keyStat: parsed.keyStat || undefined,
    cta: parsed.cta ?? "Follow for more",
    enhancedPrompt,
  };
}

export async function generateCaptionPack(
  geminiKey: string,
  plan: VideoPlan,
): Promise<CaptionPack | null> {
  if (!geminiKey.trim()) return null;
  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const prompt = `Create a TikTok caption pack for this video plan.
Title: ${plan.title}
Scenes: ${plan.scenes.map((s) => s.caption_lines.join(" ")).join(" | ")}

Return ONLY JSON:
{
  "title": "short title",
  "description": "1-2 sentence caption body",
  "hashtags": ["tag1","tag2","tag3","tag4","tag5"],
  "postingTimeHint": "e.g. evenings 7-9pm local"
}`;

  const res = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
  });
  const text = res.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const parsed = JSON.parse(match[0]) as CaptionPack;
  const hashtags = (parsed.hashtags ?? []).map((h) => (h.startsWith("#") ? h : `#${h}`)).slice(0, 8);
  const fullCaption = [parsed.description, hashtags.join(" ")].filter(Boolean).join("\n\n");
  return {
    title: parsed.title ?? plan.title,
    description: parsed.description ?? "",
    hashtags,
    postingTimeHint: parsed.postingTimeHint ?? "Evenings 7–9pm local",
    fullCaption,
  };
}

export function runViralQc(plan: VideoPlan): ViralQcResult {
  const reasons: string[] = [];
  let score = 100;
  const count = plan.scenes.length;
  const duration = plan.target_duration_sec;
  const hasReHook = plan.scenes.some((s) => s.role === "re_hook");
  const hook = plan.scenes.find((s) => s.role === "hook");
  const hasStatOrCallout = plan.scenes.some(
    (s) => s.layout === "stat" || s.layout === "big_callout" || (s.callouts?.length ?? 0) > 0,
  );

  if (count < 8 || count > 10) {
    reasons.push(`scene count ${count} (want 8–10)`);
    score -= 25;
  }
  if (duration < 30 || duration > 45) {
    reasons.push(`duration ${duration}s (want 30–45)`);
    score -= 20;
  }
  if (!hasReHook) {
    reasons.push("missing re_hook scene");
    score -= 30;
  }
  if (hook && hook.duration_sec > 5) {
    reasons.push(`hook ${hook.duration_sec}s > 5s`);
    score -= 15;
  }
  if (!hasStatOrCallout) {
    reasons.push("no stat/callout visual");
    score -= 10;
  }

  return { pass: score >= 70 && hasReHook, score: Math.max(0, score), reasons };
}
