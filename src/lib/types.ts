export type RenderPreset = "deep_explainer" | "news_60_80" | "ultra_25_35";
export type LayoutMode = "tri" | "mono" | "dual";
export type TemplateId = "NewsStoryV1" | "CorporateNewsV1" | "YouTubeStoryV1";

export type RenderOptions = {
  preset: RenderPreset;
  template: TemplateId;
  enable_callouts: boolean;
  enable_progress: boolean;
  layout_mode: LayoutMode;
  voice?: string;
  contentModel?: string;
  audioModel?: string;
};

export const DEFAULT_OPTIONS: RenderOptions = {
  preset: "deep_explainer",
  template: "NewsStoryV1",
  enable_callouts: true,
  enable_progress: true,
  layout_mode: "tri",
  voice: "Zephyr",
  contentModel: "gemini-3.5-flash",
  audioModel: "gemini-3.1-flash-tts-preview",
};

export type AppPage = "create" | "youtube" | "history" | "templates" | "settings";

export type GenerationStatus =
  | "idle"
  | "reading_article"
  | "capturing_screenshots"
  | "writing_script"
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
  | { type: "log"; step?: WorkerStep; message: string; [k: string]: unknown }
  | { type: "done"; projectDir: string; mp4: string; [k: string]: unknown }
  | { type: "error"; message: string; [k: string]: unknown };

export type VideoPlan = {
  title: string;
  target_duration_sec: number;
  scenes: Array<{
    id: string;
    role: string;
    duration_sec: number;
    caption_lines: string[];
    voiceover: string;
    layout?: "screenshot" | "big_callout" | "split" | "broll";
    callouts?: string[];
    screenshot_path?: string;
    pexels_query?: string;
    broll_path?: string;
  }>;
};

