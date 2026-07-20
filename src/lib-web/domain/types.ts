export type RenderPreset = "deep_explainer" | "news_60_80" | "ultra_25_35" | "viral_30_45";
export type LayoutMode = "tri" | "mono" | "dual";
export type TemplateId = "NewsStoryV1" | "CorporateNewsV1" | "YouTubeStoryV1";

export type RenderOptions = {
  preset: RenderPreset;
  template: TemplateId;
  enable_callouts: boolean;
  enable_progress: boolean;
  layout_mode: LayoutMode;
  enable_cut_sfx?: boolean;
  voice?: string;
  contentModel?: string;
  audioModel?: string;
};

export const DEFAULT_OPTIONS: RenderOptions = {
  preset: "deep_explainer",
  template: "NewsStoryV1",
  enable_callouts: true,
  enable_progress: true,
  enable_cut_sfx: false,
  layout_mode: "tri",
  voice: "Zephyr",
  contentModel: "gemini-3.5-flash",
  audioModel: "gemini-3.1-flash-tts-preview",
};

export type RenderJobStatus =
  | "queued"
  | "planning"
  | "awaiting_review"
  | "rendering"
  | "completed"
  | "failed";

export type GenerationStatus =
  | "idle"
  | "reading_article"
  | "capturing_screenshots"
  | "writing_script"
  | "awaiting_assets"
  | "generating_voiceover"
  | "rendering_video"
  | "finalizing_export"
  | "completed"
  | "failed";

export type WorkerStep =
  | "config"
  | "extract"
  | "screenshot"
  | "plan"
  | "fetch_broll"
  | "tts"
  | "audio_fit"
  | "plan_rewrite"
  | "render"
  | "qc";

export type WorkerEvent =
  | { type: "step_start"; step: WorkerStep; [k: string]: unknown }
  | { type: "step_done"; step: WorkerStep; [k: string]: unknown }
  | { type: "plan_ready"; projectDir: string; plan: VideoPlan; jobId?: string; [k: string]: unknown }
  | { type: "log"; step?: WorkerStep; message: string; [k: string]: unknown }
  | { type: "done"; projectDir: string; mp4?: string; mp4Url?: string; planReady?: boolean; jobId?: string; [k: string]: unknown }
  | { type: "error"; message: string; [k: string]: unknown };

export type VideoPlan = {
  title: string;
  target_duration_sec: number;
  audio_prompt?: string;
  scenes: Array<{
    id: string;
    role: string;
    duration_sec: number;
    caption_lines: string[];
    voiceover: string;
    layout?: "screenshot" | "big_callout" | "split" | "broll" | "stat" | "bar_chart";
    callouts?: string[];
    screenshot_path?: string;
    screenshot_file?: string;
    image_fit?: "cover" | "contain";
    pexels_query?: string;
    pexels_credit?: string;
    pexels_url?: string;
    broll_path?: string;
    caption_emphasis?: string[];
    interrupt_strength?: "normal" | "strong";
    stat?: { value: string; label: string; delta?: string };
    chart?: { title?: string; bars: Array<{ label: string; value: number }> };
  }>;
};

export type RenderJob = {
  id: string;
  templateId: string;
  status: RenderJobStatus;
  stage: "plan" | "render" | null;
  createdAt: string;
  expiresAt: string;
  projectDir: string;
  plan?: VideoPlan;
  error?: string;
  artifacts?: {
    mp4Path?: string;
    thumbPath?: string;
  };
};

export type GenerationRequest = {
  templateId: string;
  input: {
    mode: "url" | "prompt" | "script";
    url?: string;
    prompt?: string;
    script?: string;
  };
  options: RenderOptions;
  keys: {
    gemini: string;
    pexels?: string;
  };
};
