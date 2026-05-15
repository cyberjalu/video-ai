import { AlertTriangle, Clapperboard, Film } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ArticlePreviewCard } from "../components/ArticlePreviewCard";
import { GenerationStepper } from "../components/GenerationStepper";
import { ScenePlanPanel } from "../components/ScenePlanPanel";
import { InputModeCard, type InputMode } from "../components/InputModeCard";
import { VideoPreviewCard } from "../components/VideoPreviewCard";
import { EmptyState } from "../components/EmptyState";
import { PageTransition } from "../components/PageTransition";
import type { UiStep } from "../lib/generation";
import type { GenerationStatus, VideoPlan } from "../lib/types";

export function CreateVideoPage({
  inputMode,
  onChangeMode,
  url,
  onChangeUrl,
  promptText,
  onChangePrompt,
  urlError,
  onPasteFromClipboard,
  onCreate,
  isBusy,
  status,
  steps,
  progressPercent,
  elapsedMs,
  progressDescription,
  articleTitle,
  sourceDomain,
  estimatedWords,
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
  inputMode: InputMode;
  onChangeMode: (mode: InputMode) => void;
  url: string;
  onChangeUrl: (v: string) => void;
  promptText: string;
  onChangePrompt: (v: string) => void;
  urlError?: string | null;
  onPasteFromClipboard: () => void;
  onCreate: () => void;
  isBusy: boolean;
  status: GenerationStatus;
  steps: UiStep[];
  progressPercent: number;
  elapsedMs: number;
  progressDescription?: string;
  articleTitle?: string | null;
  sourceDomain?: string | null;
  estimatedWords?: number | null;
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

  return (
    <PageTransition className="mx-auto w-full max-w-[1260px]">
      {/* Hero input — full width */}
      <InputModeCard
        inputMode={inputMode}
        onChangeMode={onChangeMode}
        url={url}
        onChangeUrl={onChangeUrl}
        promptText={promptText}
        onChangePrompt={onChangePrompt}
        onPasteFromClipboard={onPasteFromClipboard}
        onCreate={onCreate}
        disabled={isBusy}
        isLoading={isBusy}
        error={urlError ?? null}
      />

      {/* 2-column layout */}
      <div className="mt-8 grid gap-6 xl:grid-cols-12">
        {/* Left column: progress + article + scenes */}
        <div className="space-y-6 xl:col-span-7">
          {showProgress ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <GenerationStepper
                steps={steps}
                progressPercent={progressPercent}
                elapsedMs={elapsedMs}
                currentDescription={progressDescription}
              />
            </motion.div>
          ) : (
            <EmptyState
              title="Ready when you are"
              description="Enter a news URL or a text prompt. We'll extract content, write the script, record voiceover, and render your TikTok video automatically."
              icon={<Clapperboard className="h-4 w-4" />}
            />
          )}

          {showArticle ? (
            <ArticlePreviewCard
              title={articleTitle!}
              source={sourceDomain ?? undefined}
              estimatedWords={estimatedWords ?? undefined}
              suggestedScenes={suggestedScenes ?? undefined}
              suggestedDurationSec={suggestedDurationSec ?? undefined}
            />
          ) : null}

          <ScenePlanPanel plan={plan} />

          {showErrorPanel ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EmptyState
                title="We couldn't finish this video"
                description={errorMessage!}
                icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
              />
            </motion.div>
          ) : null}
        </div>

        {/* Right column: video preview */}
        <div className="xl:col-span-5">
          {mp4Path ? (
            <VideoPreviewCard
              title={plan?.title ?? articleTitle ?? undefined}
              source={sourceDomain ?? undefined}
              durationSec={plan?.target_duration_sec ?? suggestedDurationSec ?? undefined}
              sceneCount={plan?.scenes.length ?? suggestedScenes ?? undefined}
              mp4Path={mp4Path}
              outputDir={outputDir}
              captionText={captionText ?? null}
              onCreateAnother={onCreateAnother}
              onCopyCaption={onCopyCaption}
            />
          ) : (
            <EmptyState
              title="Video preview will appear here"
              description="Your rendered TikTok video will be playable and downloadable once generation completes."
              icon={<Film className="h-4 w-4" />}
            />
          )}
        </div>
      </div>
    </PageTransition>
  );
}
