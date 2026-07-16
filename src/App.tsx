import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { AnimatePresence } from "framer-motion";

import { AppShell } from "./components/AppShell";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { ToastProvider, useToast } from "./components/Toast";
import { CreateVideoPage } from "./pages/CreateVideoPage";
import { YouTubeVideoPage } from "./pages/YouTubeVideoPage";
import { VideoDubPage } from "./pages/VideoDubPage";
import { SettingsPage } from "./pages/SettingsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { TemplatesPage } from "./pages/TemplatesPage";

import {
  applyWorkerEventToSteps,
  deriveProgressPercent,
  friendlyErrorMessage,
  initialSteps,
} from "./lib/generation";
import {
  loadGeminiKey,
  loadPexelsKey,
  loadRenderOptions,
  saveGeminiKey,
  savePexelsKey,
  saveRenderOptions,
} from "./lib/storage";
import { cancelRender, startRender, readTextFileSafe, writePlanJson } from "./lib/tauri";
import { parseWorkerEventLine } from "./lib/workerEvents";
import type { AppPage, GenerationStatus, RenderOptions, VideoPlan } from "./lib/types";
import type { UiStep } from "./lib/generation";

const PAGE_TITLES: Record<AppPage, string> = {
  create: "Create Video",
  youtube: "YouTube Video",
  video_dub: "Video Dub",
  history: "History",
  templates: "Templates",
  settings: "Settings",
};

function AppInner() {
  const { toast } = useToast();

  // ─── Navigation ─────────────────────────────────────────────────────────────
  const [page, setPage] = useState<AppPage>("create");

  // ─── Persistent Settings ─────────────────────────────────────────────────────
  const [geminiKey, setGeminiKey] = useState("");
  const [pexelsKey, setPexelsKey] = useState("");
  const [options, setOptions] = useState<RenderOptions>(loadRenderOptions());

  useEffect(() => {
    setGeminiKey(loadGeminiKey());
    setPexelsKey(loadPexelsKey());
    setOptions(loadRenderOptions());
  }, []);

  function handleSaveSettings() {
    saveGeminiKey(geminiKey);
    savePexelsKey(pexelsKey);
    saveRenderOptions(options);
    toast({ title: "Settings saved", variant: "success" });
  }

  // ─── Generation State ─────────────────────────────────────────────────────
  const [inputMode, setInputMode] = useState<"url" | "prompt">("url");
  const [promptText, setPromptText] = useState("");
  const [url, setUrl] = useState("");
  const [audioPath, setAudioPath] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [steps, setSteps] = useState<UiStep[]>(initialSteps());
  const [logLines, setLogLines] = useState<string[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Article metadata derived from worker events
  const [articleTitle, setArticleTitle] = useState<string | null>(null);
  const [sourceDomain, setSourceDomain] = useState<string | null>(null);
  const [estimatedWords, setEstimatedWords] = useState<number | null>(null);
  const [suggestedScenes, setSuggestedScenes] = useState<number | null>(null);
  const [suggestedDurationSec, setSuggestedDurationSec] = useState<number | null>(null);
  const [plan, setPlan] = useState<VideoPlan | null>(null);
  const [mp4Path, setMp4Path] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressDescription, setProgressDescription] = useState<string | undefined>(undefined);
  const activeStageRef = useRef<"plan" | "render" | "full">("plan");

  const isBusy =
    status !== "idle" &&
    status !== "completed" &&
    status !== "failed" &&
    status !== "awaiting_assets";
  const progressPercent = deriveProgressPercent(steps);

  // ─── Tauri Event Listeners ────────────────────────────────────────────────
  useEffect(() => {
    let un1: (() => void) | null = null;
    let un2: (() => void) | null = null;
    let un3: (() => void) | null = null;

    (async () => {
      // render_log → parse worker JSON events OR treat as raw log line
      un1 = await listen<string>("render_log", (e) => {
        const line = e.payload;
        setLogLines((prev) => [...prev, line]);

        const event = parseWorkerEventLine(line);
        if (!event) return;

        // Apply to stepper
        setSteps((prev) => {
          const { steps: next, status: newStatus } = applyWorkerEventToSteps(prev, event);
          if (newStatus) setStatus(newStatus);
          return next;
        });

        if (event.type === "error") {
          stopTimer();
          setStatus("failed");
          setErrorMessage(event.message || friendlyErrorMessage("Generation failed"));
          toast({
            title: "Generation failed",
            description: event.message || "Unknown error",
            variant: "error",
          });
          return;
        }

        // Extract rich metadata from events
        if (event.type === "step_start" && event.step === "extract") {
          setProgressDescription("Reading the article content…");
        }
        if (event.type === "step_start" && event.step === "screenshot") {
          setProgressDescription("Capturing article screenshots…");
        }
        if (event.type === "step_start" && event.step === "plan") {
          setProgressDescription("Writing your video script with AI…");
        }
        if (event.type === "step_start" && event.step === "tts") {
          setProgressDescription("Generating natural-sounding voiceover…");
        }
        if (event.type === "step_start" && event.step === "render") {
          setProgressDescription("Rendering your TikTok video…");
        }
        if (event.type === "step_start" && event.step === "qc") {
          setProgressDescription("Finalizing and exporting…");
        }

        // Capture article metadata from log events
        if (event.type === "log") {
          const msg = event.message ?? "";
          // Try to parse article title / words / domain from log messages
          const titleMatch = msg.match(/title[:\s]+(.{10,120})/i);
          if (titleMatch && !articleTitle) setArticleTitle(titleMatch[1].trim());

          const wordsMatch = msg.match(/(\d+)\s*words?/i);
          if (wordsMatch) setEstimatedWords(Number(wordsMatch[1]));

          const scenesMatch = msg.match(/(\d+)\s*scenes?/i);
          if (scenesMatch) setSuggestedScenes(Number(scenesMatch[1]));

          const durationMatch = msg.match(/(\d+)\s*(?:sec(?:onds?)?|s)\b/i);
          if (durationMatch && Number(durationMatch[1]) > 5)
            setSuggestedDurationSec(Number(durationMatch[1]));
        }

        // Plan loaded
        if (event.type === "step_done" && event.step === "plan") {
          const rawEvent = event as unknown as { plan?: VideoPlan };
          if (rawEvent.plan) {
            const p = rawEvent.plan;
            setPlan(p);
            setArticleTitle((prev) => prev ?? p.title);
            setSuggestedScenes((prev) => prev ?? p.scenes.length);
            setSuggestedDurationSec((prev) => prev ?? p.target_duration_sec);
          }
        }

        if (event.type === "plan_ready") {
          stopTimer();
          setStatus("awaiting_assets");
          setOutputDir(event.projectDir);
          if (event.plan) {
            setPlan(event.plan);
            setArticleTitle((prev) => prev ?? event.plan.title);
            setSuggestedScenes((prev) => prev ?? event.plan.scenes.length);
            setSuggestedDurationSec((prev) => prev ?? event.plan.target_duration_sec);
          }
          setProgressDescription("Attach visuals per scene, or continue — Pexels fills empty scenes.");
          toast({
            title: "Scene plan ready",
            description: "Add images/videos or continue to auto-fill from Pexels.",
            variant: "success",
          });
        }

        if (event.type === "done" && event.planReady) {
          stopTimer();
          setStatus("awaiting_assets");
          if (event.projectDir) setOutputDir(event.projectDir);
        }
      });

      // render_done
      un2 = await listen<number>("render_done", () => {
        if (activeStageRef.current === "plan") {
          // Worker finished plan stage successfully; awaiting_assets already set via plan_ready
          return;
        }
        stopTimer();
        setStatus("completed");
        setProgressDescription("Your video is ready!");
        toast({ title: "Video ready!", description: "Your TikTok video has been rendered.", variant: "success" });
      });

      // render_error
      un3 = await listen<string>("render_error", (e) => {
        stopTimer();
        setSteps((prev) => prev.map((s) => (s.state === "running" ? { ...s, state: "failed" } : s)));
        setStatus("failed");
        const msg = e.payload?.trim() ? e.payload : "Generation failed";
        setErrorMessage(friendlyErrorMessage(msg));
        toast({ title: "Generation failed", description: msg, variant: "error" });
      });
    })();

    return () => {
      un1?.();
      un2?.();
      un3?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also listen for a worker "done" event emitted via render_log JSON lines
  useEffect(() => {
    // When mp4 path arrives via log line (JSON done event)
    const lastLine = logLines[logLines.length - 1];
    if (!lastLine) return;
    try {
      const obj = JSON.parse(lastLine.trim()) as { type?: string; mp4?: string; projectDir?: string };
      if (obj.type === "done") {
        if (obj.mp4) setMp4Path(obj.mp4);
        if (obj.projectDir) setOutputDir(obj.projectDir);
      }
    } catch {
      // Not JSON, ignore
    }
    // Try loading plan.json from projectDir if we have one
  }, [logLines]);

  // After outputDir is known, try to load plan.json
  useEffect(() => {
    if (!outputDir || plan) return;
    const planPath = `${outputDir}/plan/video_plan.json`;
    readTextFileSafe(planPath)
      .then((raw) => {
        try {
          const p = JSON.parse(raw) as VideoPlan;
          setPlan(p);
          setArticleTitle((prev) => prev ?? p.title);
          setSuggestedScenes((prev) => prev ?? p.scenes.length);
          setSuggestedDurationSec((prev) => prev ?? p.target_duration_sec);
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* plan.json may not exist */
      });
  }, [outputDir, plan]);

  // ─── Timer ────────────────────────────────────────────────────────────────
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

  // ─── Input Validation ────────────────────────────────────────────────────────
  function validateInput(): string | null {
    if (page === "youtube") {
      if (!audioPath) return "Please select an audio file.";
      if (!scriptText.trim()) return "Please enter the script text.";
      return null;
    }
    if (inputMode === "url") {
      if (!url.trim()) return "Please enter an article URL.";
      try {
        const u = new URL(url);
        if (!["http:", "https:"].includes(u.protocol)) return "URL must start with http:// or https://";
      } catch {
        return "That doesn't look like a valid URL. Please check and try again.";
      }
    } else {
      if (!promptText.trim()) return "Please enter a prompt.";
      if (promptText.trim().length < 10) return "Prompt is too short. Please be more descriptive.";
    }
    return null;
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────
  function handleChangeUrl(v: string) {
    setUrl(v);
    if (urlError) setUrlError(null);
  }

  function handleChangePrompt(v: string) {
    setPromptText(v);
    if (urlError) setUrlError(null);
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (inputMode === "url") {
        setUrl(text.trim());
      } else {
        setPromptText(text.trim());
      }
      setUrlError(null);
    } catch {
      toast({ title: "Clipboard error", description: "Could not read from clipboard.", variant: "error" });
    }
  }

  const handleCreate = useCallback(async () => {
    const err = validateInput();
    if (err) {
      setUrlError(err);
      return;
    }
    setUrlError(null);

    const key = loadGeminiKey();
    if (!key) {
      setPage("settings");
      toast({
        title: "API key required",
        description: "Please add your Gemini API key in Settings first.",
        variant: "error",
      });
      return;
    }

    // Reset state
    const initSteps = initialSteps();
    if (initSteps.length > 0) {
      initSteps[0].state = "running";
    }
    setSteps(initSteps);
    setLogLines([]);
    setElapsedMs(0);
    setErrorMessage(null);
    setMp4Path(null);
    setOutputDir(null);
    setPlan(null);
    setArticleTitle(null);
    setSourceDomain(null);
    setEstimatedWords(null);
    setSuggestedScenes(null);
    setSuggestedDurationSec(null);
    setProgressDescription(undefined);

    // Extract domain for display
    try {
      if (page === "youtube") {
        setSourceDomain("YouTube Script");
      } else if (inputMode === "url") {
        setSourceDomain(new URL(url).hostname.replace("www.", ""));
      } else {
        setSourceDomain("AI Prompt");
      }
    } catch {
      /* ignore */
    }

    setStatus("reading_article");
    startTimer();
    activeStageRef.current = "plan";

    const renderOptions: RenderOptions =
      page === "youtube" ? { ...options, template: "YouTubeStoryV1" } : options;

    try {
      await startRender({
        url: page === "create" && inputMode === "url" ? url : undefined,
        prompt: page === "create" && inputMode === "prompt" ? promptText : undefined,
        audioPath: page === "youtube" ? audioPath : undefined,
        script: page === "youtube" ? scriptText : undefined,
        platform: page === "youtube" ? "youtube" : undefined,
        geminiApiKey: key,
        pexelsApiKey: pexelsKey,
        options: renderOptions,
        stage: "plan",
      });
    } catch (e) {
      stopTimer();
      setStatus("failed");
      setErrorMessage(friendlyErrorMessage(String(e)));
      setSteps((prev) => prev.map((s) => (s.state === "running" ? { ...s, state: "failed" } : s)));
      toast({ title: "Failed to start", description: String(e), variant: "error" });
    }
  }, [url, promptText, inputMode, audioPath, scriptText, page, options, pexelsKey, toast]);

  async function handleContinueRender() {
    if (!outputDir) {
      toast({ title: "Missing project", description: "No project folder from plan stage.", variant: "error" });
      return;
    }
    const key = loadGeminiKey();
    if (!key) {
      setPage("settings");
      toast({ title: "API key required", description: "Add your Gemini API key in Settings.", variant: "error" });
      return;
    }

    const emptyVisuals =
      plan?.scenes.filter(
        (s) =>
          s.layout !== "big_callout" &&
          s.layout !== "bar_chart" &&
          !s.screenshot_path &&
          !s.broll_path,
      ).length ?? 0;
    if (emptyVisuals > 0 && !pexelsKey.trim()) {
      toast({
        title: "Pexels key recommended",
        description: `${emptyVisuals} scene(s) have no assets. Add a Pexels API key in Settings for auto-fill, or upload files.`,
        variant: "error",
      });
    }

    if (plan) {
      try {
        await writePlanJson(outputDir, plan);
      } catch (e) {
        toast({ title: "Could not save plan", description: String(e), variant: "error" });
        return;
      }
    }

    setMp4Path(null);
    setErrorMessage(null);
    setStatus("generating_voiceover");
    setProgressDescription("Fetching stock media and rendering…");
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id === "awaiting_assets") return { ...s, state: "completed" };
        if (s.id === "generating_voiceover") return { ...s, state: "running" };
        return s;
      }),
    );
    startTimer();
    activeStageRef.current = "render";

    const renderOptions: RenderOptions =
      page === "youtube" ? { ...options, template: "YouTubeStoryV1" } : options;

    try {
      await startRender({
        geminiApiKey: key,
        pexelsApiKey: pexelsKey,
        options: renderOptions,
        stage: "render",
        projectDir: outputDir,
        planFile: `${outputDir}/plan/video_plan.json`,
        platform: page === "youtube" ? "youtube" : undefined,
      });
    } catch (e) {
      stopTimer();
      setStatus("failed");
      setErrorMessage(friendlyErrorMessage(String(e)));
      toast({ title: "Failed to continue", description: String(e), variant: "error" });
    }
  }

  async function handleRerenderWithAssets() {
    await handleContinueRender();
  }
  async function handleCancel() {
    try {
      await cancelRender();
      stopTimer();
      setStatus("failed");
      setErrorMessage("Cancelled by user");
      setSteps((prev) => prev.map((s) => (s.state === "running" ? { ...s, state: "failed" } : s)));
      toast({ title: "Cancelled", description: "Render job was cancelled.", variant: "error" });
    } catch (e) {
      toast({ title: "Cancel failed", description: String(e), variant: "error" });
    }
  }

  function handleCreateAnother() {
    setStatus("idle");
    setSteps(initialSteps());
    setLogLines([]);
    setElapsedMs(0);
    setErrorMessage(null);
    setMp4Path(null);
    setOutputDir(null);
    setPlan(null);
    setArticleTitle(null);
    setSourceDomain(null);
    setEstimatedWords(null);
    setSuggestedScenes(null);
    setSuggestedDurationSec(null);
    setProgressDescription(undefined);
    setUrl("");
    setAudioPath("");
    setScriptText("");
    stopTimer();
  }

  async function handleCopyCaption() {
    const text = plan
      ? `${plan.title}\n\nGenerated with ClipNews AI — turn any article into a TikTok video.`
      : "";
    if (text) {
      await navigator.clipboard.writeText(text);
      toast({ title: "Caption copied!", variant: "success" });
    }
  }

  function handleOpenOutputFolder() {
    if (outputDir) revealItemInDir(outputDir);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  const captionText = plan
    ? `${plan.title}\n\nGenerated with ClipNews AI — turn any article into a TikTok video.`
    : null;

  return (
    <AppShell
      sidebar={
        <Sidebar active={page} onNavigate={setPage} />
      }
      topbar={
        <TopBar
          title={PAGE_TITLES[page]}
          status={status}
          onOpenOutputFolder={outputDir ? handleOpenOutputFolder : undefined}
        />
      }
    >
      <AnimatePresence mode="wait">
        <div key={page} className="w-full h-full">
          {page === "youtube" && (
            <YouTubeVideoPage
              audioPath={audioPath}
              onChangeAudioPath={setAudioPath}
              scriptText={scriptText}
              onChangeScript={setScriptText}
              error={urlError ?? null}
              onCreate={handleCreate}
              isBusy={isBusy}
              status={status}
              steps={steps}
              progressPercent={progressPercent}
              elapsedMs={elapsedMs}
              progressDescription={progressDescription}
              articleTitle={articleTitle}
              suggestedScenes={suggestedScenes}
              suggestedDurationSec={suggestedDurationSec}
              mp4Path={mp4Path}
              outputDir={outputDir}
              plan={plan}
              onPlanChange={setPlan}
              captionText={captionText}
              errorMessage={errorMessage}
              onCreateAnother={handleCreateAnother}
              onCopyCaption={handleCopyCaption}
              onCancel={handleCancel}
              onContinueRender={handleContinueRender}
              onRerender={handleRerenderWithAssets}
              hasPexelsKey={Boolean(pexelsKey.trim())}
            />
          )}

          {page === "create" && (
            <CreateVideoPage
              inputMode={inputMode}
              onChangeMode={setInputMode}
              url={url}
              onChangeUrl={handleChangeUrl}
              promptText={promptText}
              onChangePrompt={handleChangePrompt}
              urlError={urlError}
              onPasteFromClipboard={handlePasteFromClipboard}
              onCreate={handleCreate}
              isBusy={isBusy}
              status={status}
              steps={steps}
              progressPercent={progressPercent}
              elapsedMs={elapsedMs}
              progressDescription={progressDescription}
              articleTitle={articleTitle}
              sourceDomain={sourceDomain}
              estimatedWords={estimatedWords}
              suggestedScenes={suggestedScenes}
              suggestedDurationSec={suggestedDurationSec}
              mp4Path={mp4Path}
              outputDir={outputDir}
              plan={plan}
              onPlanChange={setPlan}
              captionText={captionText}
              errorMessage={errorMessage}
              onCreateAnother={handleCreateAnother}
              onCopyCaption={handleCopyCaption}
              onCancel={handleCancel}
              onContinueRender={handleContinueRender}
              onRerender={handleRerenderWithAssets}
              hasPexelsKey={Boolean(pexelsKey.trim())}
            />
          )}

          {page === "video_dub" && (
            <VideoDubPage
              options={options}
              onChangeOptions={(o) => {
                setOptions(o);
                saveRenderOptions(o);
              }}
            />
          )}

          {page === "history" && <HistoryPage />}

          {page === "templates" && (
            <TemplatesPage
              options={options}
              onChangeOptions={(o) => {
                setOptions(o);
                saveRenderOptions(o);
              }}
            />
          )}

          {page === "settings" && (
            <SettingsPage
              geminiKey={geminiKey}
              onChangeGeminiKey={setGeminiKey}
              pexelsKey={pexelsKey}
              onChangePexelsKey={setPexelsKey}
              options={options}
              onChangeOptions={setOptions}
              onSave={handleSaveSettings}
            />
          )}
        </div>
      </AnimatePresence>
    </AppShell>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
