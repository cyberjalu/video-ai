import type { z } from "zod";
import type { RenderOptions, RenderPreset, TemplateId } from "@/lib/domain/types";
import { tiktokNeonInput } from "./schemas/tiktok-neon";
import { corporateBriefInput } from "./schemas/corporate-brief";
import { youtubeLandscapeInput } from "./schemas/youtube-landscape";
import { aiExplainerInput } from "./schemas/ai-explainer";
import { viralFastInput } from "./schemas/viral-fast";

export type TemplateCategory = "tiktok" | "explainer" | "youtube" | "education" | "product";
export type AspectRatio = "9:16" | "16:9";

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail: string;
  aspectRatio: AspectRatio;
  compositionId: TemplateId;
  defaultPreset: RenderPreset;
  defaultOptions: Partial<RenderOptions>;
  inputSchema: z.ZodTypeAny;
  enabled: boolean;
  tone?: string;
  useCases?: string[];
}

export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  {
    id: "tiktok-neon",
    name: "Neon Glitch",
    description: "Dark vertical template with neon accents — news and explainer topics.",
    category: "tiktok",
    thumbnail: "/templates/thumbnails/tiktok-neon.svg",
    aspectRatio: "9:16",
    compositionId: "NewsStoryV1",
    defaultPreset: "ultra_25_35",
    defaultOptions: { enable_callouts: true, enable_progress: true, layout_mode: "tri" },
    inputSchema: tiktokNeonInput,
    enabled: true,
    tone: "punchy, urgent",
    useCases: ["Breaking news", "Hot takes", "Quick explainers"],
  },
  {
    id: "corporate-brief",
    name: "Corporate Slate",
    description: "Clean vertical news look inspired by finance briefings.",
    category: "explainer",
    thumbnail: "/templates/thumbnails/corporate-brief.svg",
    aspectRatio: "9:16",
    compositionId: "CorporateNewsV1",
    defaultPreset: "news_60_80",
    defaultOptions: { enable_callouts: true, enable_progress: true, layout_mode: "tri" },
    inputSchema: corporateBriefInput,
    enabled: true,
    tone: "professional, clear",
    useCases: ["Earnings summaries", "Policy updates", "B2B news"],
  },
  {
    id: "youtube-landscape",
    name: "YouTube Landscape",
    description: "1920×1080 landscape template for YouTube Shorts-style scripts.",
    category: "youtube",
    thumbnail: "/templates/thumbnails/youtube-landscape.svg",
    aspectRatio: "16:9",
    compositionId: "YouTubeStoryV1",
    defaultPreset: "deep_explainer",
    defaultOptions: { enable_callouts: true, enable_progress: false, layout_mode: "tri" },
    inputSchema: youtubeLandscapeInput,
    enabled: true,
    tone: "informative",
    useCases: ["Script-to-video", "Landscape explainers"],
  },
  {
    id: "ai-explainer",
    name: "AI Explainer",
    description: "Longer deep-dive vertical explainer with more scenes.",
    category: "explainer",
    thumbnail: "/templates/thumbnails/ai-explainer.svg",
    aspectRatio: "9:16",
    compositionId: "NewsStoryV1",
    defaultPreset: "deep_explainer",
    defaultOptions: { enable_callouts: true, enable_progress: true, layout_mode: "tri" },
    inputSchema: aiExplainerInput,
    enabled: true,
    tone: "educational, thorough",
    useCases: ["AI concepts", "How-it-works", "Tech explainers"],
  },
  {
    id: "viral-fast",
    name: "Viral Fast Cuts",
    description: "30–45s fast-cut pacing with hook and re-hook scenes.",
    category: "tiktok",
    thumbnail: "/templates/thumbnails/viral-fast.svg",
    aspectRatio: "9:16",
    compositionId: "ViralNewsV1",
    defaultPreset: "viral_30_45",
    defaultOptions: { enable_callouts: true, enable_progress: true, enable_cut_sfx: true, layout_mode: "tri" },
    inputSchema: viralFastInput,
    enabled: true,
    tone: "high-energy",
    useCases: ["Viral news", "Trending topics", "Quick hooks"],
  },
];

export function listTemplates(filter?: {
  category?: TemplateCategory;
  enabled?: boolean;
}): TemplateDefinition[] {
  return TEMPLATE_REGISTRY.filter((t) => {
    if (filter?.enabled === true && !t.enabled) return false;
    if (filter?.category && t.category !== filter.category) return false;
    return true;
  });
}

export function getTemplate(id: string): TemplateDefinition | undefined {
  return TEMPLATE_REGISTRY.find((t) => t.id === id);
}

export function getTemplateOrThrow(id: string): TemplateDefinition {
  const t = getTemplate(id);
  if (!t) throw new Error(`Unknown template: ${id}`);
  return t;
}
