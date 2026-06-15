import { useEffect, useRef, useState } from "react";
import { Video } from "lucide-react";
import { motion } from "framer-motion";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

import { PageTransition } from "../components/PageTransition";
import { GenerationStepper } from "../components/GenerationStepper";
import { PrimaryButton } from "../components/Buttons";
import { useToast } from "../components/Toast";
import { cn } from "../lib/cn";
import { loadGeminiKey } from "../lib/storage";
import { runDubWorker, TranscriptSegment } from "../lib/dubbing";
import type { GenerationStatus, RenderOptions } from "../lib/types";
import { deriveProgressPercent, friendlyErrorMessage } from "../lib/generation";
import type { UiStep } from "../lib/generation";

import { TranscriptSegmentEditor } from "../components/dub/TranscriptSegmentEditor";
import { VoiceSettingsPanel } from "../components/dub/VoiceSettingsPanel";

const DUB_STEPS: UiStep[] = [
  { id: "extracting_audio", label: "Extracting Audio", state: "pending" },
  { id: "transcribing", label: "Transcribing Audio", state: "pending" },
  { id: "transcript_ready", label: "Transcript Ready", state: "pending" },
  { id: "generating_voiceover", label: "Generating Voiceover", state: "pending" },
  { id: "merging_audio", label: "Merging Video", state: "pending" },
];

export function VideoDubPage({
  options,
  onChangeOptions,
}: {
  options: RenderOptions;
  onChangeOptions: (o: RenderOptions) => void;
}) {
  const { toast } = useToast();

  const [videoPath, setVideoPath] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [steps, setSteps] = useState<UiStep[]>(DUB_STEPS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [outDir, setOutDir] = useState<string>("");
  const [finalMp4Path, setFinalMp4Path] = useState<string>("");

  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isBusy = ["extracting_audio", "transcribing", "generating_voiceover", "merging_audio"].includes(status);
  const progressPercent = deriveProgressPercent(steps);

  function startTimer() {
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - (startTimeRef.current ?? Date.now()));
    }, 500);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  const updateStepState = (id: string, state: "pending" | "running" | "completed" | "failed") => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, state } : s)));
  };

  useEffect(() => {
    let un1: (() => void) | null = null;
    let un2: (() => void) | null = null;
    let un3: (() => void) | null = null;

    (async () => {
      un1 = await listen<string>("dub_log", (e) => {
        try {
          const event = JSON.parse(e.payload);
          if (event.type === "step_start") {
            updateStepState(event.step, "running");
            if (event.step === "extract_original_audio") setStatus("extracting_audio");
            if (event.step === "transcribe_original") setStatus("transcribing");
            if (event.step === "generate_dub_tts") setStatus("generating_voiceover");
            if (event.step === "merge_dub_video") setStatus("merging_audio");
          }
          if (event.type === "step_done") {
            updateStepState(event.step, "completed");
            if (event.step === "extract_original_audio") {
              // audio path extracted but unused
            }
            if (event.step === "transcribe_original") {
              setSegments(event.segments);
              setStatus("transcript_ready");
              stopTimer();
            }
            if (event.step === "merge_dub_video") {
              setFinalMp4Path(event.mp4);
              setStatus("completed");
              stopTimer();
              toast({ title: "Dubbing completed!", variant: "success" });
            }
          }
          if (event.type === "error") {
            setErrorMessage(event.message);
            setStatus("failed");
            stopTimer();
            toast({ title: "Dubbing error", description: event.message, variant: "error" });
          }
        } catch {
          // just a text log
        }
      });

      un2 = await listen<number>("dub_done", () => {
        // Handled in step_done merge_dub_video usually
      });

      un3 = await listen<string>("dub_error", (e) => {
        setErrorMessage(e.payload);
        setStatus("failed");
        stopTimer();
        toast({ title: "Worker error", description: e.payload, variant: "error" });
      });
    })();

    return () => {
      un1?.();
      un2?.();
      un3?.();
    };
  }, [toast]);

  async function handleSelectVideo() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Video", extensions: ["mp4", "mov", "mkv", "webm"] }],
    });
    if (selected && typeof selected === "string") {
      setVideoPath(selected);
      // Reset state on new video
      setStatus("idle");
      setSteps(DUB_STEPS);
      setSegments([]);
      setFinalMp4Path("");
      setErrorMessage(null);
    }
  }

  const handleStartExtraction = async () => {
    if (!videoPath) {
      toast({ title: "No video", description: "Please select a video file first.", variant: "error" });
      return;
    }
    const geminiKey = loadGeminiKey();
    if (!geminiKey) {
      toast({ title: "API key required", description: "Please add your Gemini API key in Settings.", variant: "error" });
      return;
    }

    setErrorMessage(null);
    setSteps(DUB_STEPS);
    updateStepState("extracting_audio", "running");
    setStatus("extracting_audio");
    startTimer();

    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}__${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const newOutDir = `${videoPath}_dub_${stamp}`;
    setOutDir(newOutDir);

    try {
      await runDubWorker({ action: "extract", videoPath, outDir: newOutDir });
      await runDubWorker({ action: "transcribe", audioPath: `${newOutDir}/original_audio.wav`, geminiKey });
    } catch (e) {
      setStatus("failed");
      setErrorMessage(String(e));
      stopTimer();
    }
  };

  const handleGenerateDub = async () => {
    const geminiKey = loadGeminiKey();
    if (!geminiKey) return;

    if (segments.length === 0) {
      toast({ title: "No transcript", description: "Transcript is empty.", variant: "error" });
      return;
    }

    setErrorMessage(null);
    updateStepState("generating_voiceover", "running");
    setStatus("generating_voiceover");
    startTimer();

    try {
      const fullText = segments.map((s) => s.text).join(" ");
      await runDubWorker({
        action: "tts",
        text: fullText,
        outDir,
        geminiKey,
        voice: options.videoDubVoice || "Achird",
      });
      await runDubWorker({
        action: "merge",
        videoPath,
        audioPath: `${outDir}/dubbed_audio.wav`,
        outDir,
        mode: options.videoDubMode || "duck",
        duckLevel: options.videoDubDuckLevel || 0.2,
      });
    } catch (e) {
      setStatus("failed");
      setErrorMessage(String(e));
      stopTimer();
    }
  };

  return (
    <PageTransition className="mx-auto w-full max-w-[1260px] pb-10">
      <div className="surface-panel relative overflow-hidden rounded-[24px] shadow-card">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] mask-[radial-gradient(560px_circle_at_50%_0%,black,transparent_70%)] bg-hero-grid bg-grid-40" />
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-linear-to-r from-transparent via-red-500/40 to-transparent" />
        <div className="relative px-6 py-6">
          <div className="mb-6">
            <div className="eyebrow-label mb-2 text-red-400">Video Dubbing</div>
            <div className="text-[22px] font-semibold leading-tight text-zinc-100">
              Translate and dub your videos into Vietnamese with Gemini.
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-end gap-4">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">1. Select Original Video</span>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-[18px] border bg-[rgba(6,7,10,0.72)] px-4 py-3.5 transition-all duration-200 cursor-pointer hover:bg-[rgba(15,17,23,0.72)]",
                  "border-white/[0.09]"
                )}
                onClick={handleSelectVideo}
              >
                <Video className={cn("h-4 w-4 shrink-0", videoPath ? "text-red-400" : "text-zinc-600")} />
                <div className="min-w-0 flex-1 truncate text-sm text-zinc-100">
                  {videoPath ? videoPath.split(/[\\/]/).pop() : <span className="text-zinc-700">Select .mp4, .mov file...</span>}
                </div>
              </div>
            </label>

            <div className="w-full md:w-auto">
              {["idle", "failed", "extracting_audio", "transcribing"].includes(status) ? (
                <PrimaryButton
                  onClick={handleStartExtraction}
                  disabled={!videoPath || isBusy}
                  isLoading={status === "extracting_audio" || status === "transcribing"}
                  className="w-full md:w-[200px] h-[52px] bg-red-500 hover:bg-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                  {(status === "extracting_audio" || status === "transcribing") ? "Processing..." : "Transcribe"}
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  onClick={handleGenerateDub}
                  disabled={status !== "transcript_ready" || isBusy}
                  isLoading={status === "generating_voiceover" || status === "merging_audio"}
                  className="w-full md:w-[200px] h-[52px] bg-red-500 hover:bg-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                  {(status === "generating_voiceover" || status === "merging_audio") ? "Dubbing..." : "Generate Dub"}
                </PrimaryButton>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-300">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
              {friendlyErrorMessage(errorMessage)}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          {status !== "idle" && status !== "failed" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <GenerationStepper steps={steps} progressPercent={progressPercent} elapsedMs={elapsedMs} />
            </motion.div>
          )}

          {(status === "transcript_ready" || status === "generating_voiceover" || status === "merging_audio" || status === "completed") && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface-inset rounded-[20px] p-5">
              <div className="mb-4 text-sm font-semibold text-zinc-200">2. Edit Transcript</div>
              <TranscriptSegmentEditor
                segments={segments}
                onChange={setSegments}
                disabled={isBusy || status === "completed"}
              />
            </motion.div>
          )}
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <VoiceSettingsPanel
            voice={options.videoDubVoice || "Achird"}
            onChangeVoice={(v) => onChangeOptions({ ...options, videoDubVoice: v })}
            mode={options.videoDubMode || "duck"}
            onChangeMode={(m) => onChangeOptions({ ...options, videoDubMode: m })}
            duckLevel={options.videoDubDuckLevel || 0.2}
            onChangeDuckLevel={(l) => onChangeOptions({ ...options, videoDubDuckLevel: l })}
            disabled={isBusy}
          />

          {finalMp4Path && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface-inset rounded-[20px] p-5 flex flex-col items-center justify-center gap-4 text-center">
              <div className="text-sm font-semibold text-zinc-200">Video Ready!</div>
              <div className="text-xs text-zinc-500 break-all">{finalMp4Path}</div>
              <PrimaryButton
                onClick={() => revealItemInDir(finalMp4Path)}
                className="mt-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              >
                Open Folder
              </PrimaryButton>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
