import { AlertTriangle, Clapperboard, Play } from "lucide-react";
import { motion } from "framer-motion";
import { ArticlePreviewCard } from "../components/ArticlePreviewCard";
import { GenerationStepper } from "../components/GenerationStepper";
import { ScenePlanPanel } from "../components/ScenePlanPanel";
import { InputModeCard, type InputMode } from "../components/InputModeCard";
import { VideoPreviewCard } from "../components/VideoPreviewCard";
import { EmptyState } from "../components/EmptyState";
import { PageTransition } from "../components/PageTransition";
import type { UiStep } from "../lib/generation";
import type { GenerationStatus, VideoPlan } from "../lib/types";

function VideoPlaceholder() {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] p-6">
      <div
        className="relative flex items-center justify-center rounded-[18px] border border-white/[0.13] bg-[#0d0d10]"
        style={{ width: 88, height: 156 }}
      >
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 h-1.5 w-7 rounded-full bg-white/10" />
        <div className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-zinc-600">
          <Play className="h-3.5 w-3.5 ml-0.5" />
        </div>
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 h-1 w-7 rounded-full bg-white/10" />
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-zinc-400">Video preview</div>
        <div className="mt-0.5 text-xs text-zinc-600">Will appear here once generated</div>
      </div>
    </div>
  );
}

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
  onPlanChange,
  captionText,
  errorMessage,
  onCreateAnother,
  onCopyCaption,
  onCancel,
  onContinueRender,
  onRerender,
  hasPexelsKey,
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
  onPlanChange?: (plan: VideoPlan) => void;
  captionText?: string | null;
  errorMessage?: string | null;
  onCreateAnother: () => void;
  onCopyCaption: () => void;
  onCancel?: () => void;
  onContinueRender?: () => void;
  onRerender?: () => void;
  hasPexelsKey?: boolean;
}) {
  const showProgress = status !== "idle";
  const showArticle = !!articleTitle && status !== "idle";
  const showErrorPanel = status === "failed" && !!errorMessage;
  const awaiting = status === "awaiting_assets";
  const editablePlan = awaiting || status === "completed";

  return (
    <PageTransition className="mx-auto w-full max-w-[1260px]">
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

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
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
                onCancel={isBusy ? onCancel : undefined}
                awaitingAssets={awaiting}
                onContinueRender={onContinueRender}
                hasPexelsKey={hasPexelsKey}
              />
            </motion.div>
          ) : (
            <EmptyState
              title="Ready when you are"
              description="Paste any news URL or a prompt. ClipNews extracts content, writes a script, generates voiceover, and renders a short-form video."
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

          <ScenePlanPanel
            plan={plan}
            editable={editablePlan}
            projectDir={outputDir}
            onPlanChange={onPlanChange}
          />

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

        <div className="lg:col-span-5 h-full">
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
              onRerender={onRerender}
            />
          ) : (
            <VideoPlaceholder />
          )}
        </div>
      </div>
    </PageTransition>
  );
}
