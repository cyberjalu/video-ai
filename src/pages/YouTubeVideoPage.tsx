import { AlertTriangle, Clapperboard, Play, FileAudio, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { open } from "@tauri-apps/plugin-dialog";
import { ArticlePreviewCard } from "../components/ArticlePreviewCard";
import { GenerationStepper } from "../components/GenerationStepper";
import { ScenePlanPanel } from "../components/ScenePlanPanel";
import { VideoPreviewCard } from "../components/VideoPreviewCard";
import { EmptyState } from "../components/EmptyState";
import { PageTransition } from "../components/PageTransition";
import type { UiStep } from "../lib/generation";
import type { GenerationStatus, VideoPlan } from "../lib/types";
import { cn } from "../lib/cn";
import { PrimaryButton } from "../components/Buttons";

function VideoPlaceholder() {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] p-6">
      {/* 16:9 monitor frame outline */}
      <div
        className="relative flex items-center justify-center rounded-[12px] border border-white/[0.13] bg-[#0d0d10]"
        style={{ width: 156, height: 88 }}
      >
        {/* Play icon */}
        <div className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-600">
          <Play className="h-3.5 w-3.5 ml-0.5" />
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-zinc-400">Video preview</div>
        <div className="mt-0.5 text-xs text-zinc-600">Will appear here once generated</div>
      </div>
    </div>
  );
}

export function YouTubeVideoPage({
  audioPath,
  onChangeAudioPath,
  scriptText,
  onChangeScript,
  error,
  onCreate,
  isBusy,
  status,
  steps,
  progressPercent,
  elapsedMs,
  progressDescription,
  articleTitle,
  suggestedScenes,
  suggestedDurationSec,
  mp4Path,
  outputDir,
  plan,
  captionText,
  errorMessage,
  onCreateAnother,
  onCopyCaption,
}: {
  audioPath: string;
  onChangeAudioPath: (p: string) => void;
  scriptText: string;
  onChangeScript: (v: string) => void;
  error?: string | null;
  onCreate: () => void;
  isBusy: boolean;
  status: GenerationStatus;
  steps: UiStep[];
  progressPercent: number;
  elapsedMs: number;
  progressDescription?: string;
  articleTitle?: string | null;
  suggestedScenes?: number | null;
  suggestedDurationSec?: number | null;
  mp4Path?: string | null;
  outputDir?: string | null;
  plan?: VideoPlan | null;
  captionText?: string | null;
  errorMessage?: string | null;
  onCreateAnother: () => void;
  onCopyCaption: () => void;
}) {
  const showProgress = status !== "idle";
  const showArticle = !!articleTitle && status !== "idle";
  const showErrorPanel = status === "failed" && !!errorMessage;

  async function handleSelectAudio() {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Audio',
        extensions: ['mp3', 'wav', 'm4a']
      }]
    });
    if (selected && typeof selected === "string") {
      onChangeAudioPath(selected);
    }
  }

  return (
    <PageTransition className="mx-auto w-full max-w-[1260px]">
      {/* Hero input — full width */}
      <div className="surface-panel relative overflow-hidden rounded-[24px] shadow-card">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] mask-[radial-gradient(560px_circle_at_50%_0%,black,transparent_70%)] bg-hero-grid bg-grid-40" />
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-linear-to-r from-transparent via-red-500/40 to-transparent" />
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-28 w-[28rem] rounded-full bg-red-500/6 blur-3xl" />
        
        <div className="relative px-6 py-6">
          <div className="mb-6">
            <div className="eyebrow-label mb-2 text-red-400">YouTube Video</div>
            <div className="text-[22px] font-semibold leading-tight text-zinc-100">
              Create landscape 16:9 videos from your voice recording.
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-stretch gap-4">
            <div className="flex-1 flex flex-col gap-3">
              {/* Audio picker */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">1. Select Audio File</span>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-[18px] border bg-[rgba(6,7,10,0.72)] px-4 py-3.5 transition-all duration-200 cursor-pointer hover:bg-[rgba(15,17,23,0.72)]",
                    error && !audioPath ? "border-red-400/40 ring-1 ring-red-400/10" : "border-white/[0.09]"
                  )}
                  onClick={handleSelectAudio}
                >
                  <FileAudio className={cn("h-4 w-4 shrink-0", audioPath ? "text-red-400" : "text-zinc-600")} />
                  <div className="min-w-0 flex-1 truncate text-sm text-zinc-100">
                    {audioPath ? audioPath.split(/[\\/]/).pop() : <span className="text-zinc-700">Select .mp3, .wav or .m4a file...</span>}
                  </div>
                </div>
              </label>

              {/* Script textarea */}
              <label className="flex flex-col gap-1.5 flex-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">2. Paste Script</span>
                <div
                  className={cn(
                    "flex flex-1 items-start gap-3 rounded-[18px] border bg-[rgba(6,7,10,0.72)] px-4 py-3.5 transition-all duration-200",
                    error && !scriptText ? "border-red-400/40 ring-1 ring-red-400/10" : "border-white/[0.09] focus-within:border-red-400/40 focus-within:ring-1 focus-within:ring-red-400/10"
                  )}
                >
                  <FileText className="h-4 w-4 shrink-0 mt-0.5 text-zinc-600" />
                  <textarea
                    value={scriptText}
                    onChange={(e) => onChangeScript(e.currentTarget.value)}
                    placeholder="Paste the exact words spoken in the audio file to help AI sync B-roll..."
                    disabled={isBusy}
                    rows={4}
                    className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-700 focus:outline-none resize-none"
                  />
                </div>
              </label>
            </div>

            {/* Action button */}
            <div className="flex items-end md:w-[160px] pb-1">
              <PrimaryButton
                onClick={onCreate}
                disabled={isBusy}
                isLoading={isBusy}
                className="w-full h-[52px] bg-red-500 hover:bg-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]"
              >
                {isBusy ? "Generating…" : "Create Video"}
              </PrimaryButton>
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-300">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* 2-column layout */}
      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {showProgress ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <GenerationStepper steps={steps} progressPercent={progressPercent} elapsedMs={elapsedMs} currentDescription={progressDescription} />
            </motion.div>
          ) : (
            <EmptyState
              title="Ready for YouTube"
              description="Upload your voice recording and script. We'll automatically find matching 16:9 B-roll from Pexels and sync it perfectly."
              icon={<Clapperboard className="h-4 w-4" />}
            />
          )}
          {showArticle ? <ArticlePreviewCard title={articleTitle!} suggestedScenes={suggestedScenes ?? undefined} suggestedDurationSec={suggestedDurationSec ?? undefined} /> : null}
          <ScenePlanPanel plan={plan} />
          {showErrorPanel ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <EmptyState title="We couldn't finish this video" description={errorMessage!} icon={<AlertTriangle className="h-4 w-4 text-red-400" />} />
            </motion.div>
          ) : null}
        </div>

        <div className="lg:col-span-5 h-full">
          {mp4Path ? (
            <VideoPreviewCard
              title={plan?.title ?? articleTitle ?? undefined}
              durationSec={plan?.target_duration_sec ?? suggestedDurationSec ?? undefined}
              sceneCount={plan?.scenes.length ?? suggestedScenes ?? undefined}
              mp4Path={mp4Path}
              outputDir={outputDir}
              captionText={captionText ?? null}
              onCreateAnother={onCreateAnother}
              onCopyCaption={onCopyCaption}
            />
          ) : (
            <VideoPlaceholder />
          )}
        </div>
      </div>
    </PageTransition>
  );
}
