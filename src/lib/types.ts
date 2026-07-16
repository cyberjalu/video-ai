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
  videoDubVoice?: string;
  videoDubLanguage?: string;
  videoDubMode?: "replace" | "duck";
  videoDubDuckLevel?: number;
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
  videoDubVoice: "Achird",
  videoDubLanguage: "vi-VN",
  videoDubMode: "duck",
  videoDubDuckLevel: 0.2,
};

export type AppPage = "create" | "youtube" | "video_dub" | "history" | "templates" | "settings";

export type GenerationStatus =
  | "idle"
  | "reading_article"
  | "capturing_screenshots"
  | "writing_script"
  | "awaiting_assets"
  | "generating_voiceover"
  | "rendering_video"
  | "finalizing_export"
  | "extracting_audio"
  | "transcribing"
  | "transcript_ready"
  | "merging_audio"
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
  | "qc"
  | "extract_original_audio"
  | "transcribe_original"
  | "generate_dub_tts"
  | "merge_dub_video";

export type WorkerEvent =
  | { type: "step_start"; step: WorkerStep; [k: string]: unknown }
  | { type: "step_done"; step: WorkerStep; [k: string]: unknown }
  | { type: "plan_ready"; projectDir: string; plan: VideoPlan; [k: string]: unknown }
  | { type: "log"; step?: WorkerStep; message: string; [k: string]: unknown }
  | { type: "done"; projectDir: string; mp4?: string; planReady?: boolean; [k: string]: unknown }
  | { type: "error"; message: string; [k: string]: unknown };

export type VideoPlan = {
  title: string;
  target_duration_sec: number;
  /** Gemini TTS markdown prompt; cleared when voiceover is edited in the UI. */
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
    stat?: { value: string; label: string; delta?: string };
    chart?: { title?: string; bars: Array<{ label: string; value: number }> };
  }>;
};

