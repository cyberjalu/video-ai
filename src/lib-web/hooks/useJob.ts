"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyWorkerEventToSteps,
  deriveProgressPercent,
  hydrateStepsFromJob,
  initialSteps,
  resetStepsForContinue,
  type UiStep,
} from "@/lib/domain/generation";
import type { GenerationStatus, VideoPlan, WorkerEvent } from "@/lib/domain/types";
import { parseWorkerEventLine } from "@/lib/domain/workerEvents";
import { getJob, jobEventsUrl } from "@/lib/api-client";

function mapServerStatus(status: string): GenerationStatus | null {
  if (status === "awaiting_review") return "awaiting_assets";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "planning" || status === "queued") return "reading_article";
  if (status === "rendering") return "generating_voiceover";
  return null;
}

export function useJob(jobId: string) {
  const [steps, setSteps] = useState<UiStep[]>(initialSteps);
  const [status, setStatus] = useState<GenerationStatus>("reading_article");
  const [plan, setPlan] = useState<VideoPlan | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mp4Url, setMp4Url] = useState<string | null>(null);
  const [craftReport, setCraftReport] = useState<{
    pass: boolean;
    score: number;
    reasons: string[];
    rewritten?: boolean;
  } | null>(null);
  const startRef = useRef<number>(Date.now());
  const stepStartedAtRef = useRef<number>(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [runningElapsedMs, setRunningElapsedMs] = useState(0);
  const hydratedRef = useRef(false);

  const applyEvent = useCallback((event: WorkerEvent) => {
    if (event.type === "step_start") {
      stepStartedAtRef.current = Date.now();
      setRunningElapsedMs(0);
    }

    setSteps((prev) => {
      const { steps: next, status: newStatus } = applyWorkerEventToSteps(prev, event);
      if (newStatus) setStatus(newStatus);
      return next;
    });
    if (event.type === "log") {
      setLogs((p) => [...p, event.message]);
      if (/^Craft:/i.test(event.message)) {
        const pass = /pass/i.test(event.message);
        const scoreMatch = event.message.match(/\((\d+)\)/);
        const reasonPart = event.message.split("—")[1]?.trim();
        setCraftReport({
          pass,
          score: scoreMatch ? Number(scoreMatch[1]) : pass ? 80 : 50,
          reasons:
            reasonPart && reasonPart !== "ok"
              ? reasonPart.split(";").map((s) => s.trim()).filter(Boolean)
              : [],
        });
      }
      if (/^Continuing |^Restarting /i.test(event.message)) {
        setError(null);
      }
    }
    if (event.type === "plan_ready" && event.plan) setPlan(event.plan);
    if (event.type === "step_done" && event.step === "plan" && "plan" in event && event.plan) {
      setPlan(event.plan as VideoPlan);
    }
    if (event.type === "done") {
      if ("mp4Url" in event && event.mp4Url) setMp4Url(String(event.mp4Url));
      if ("mp4" in event && event.mp4) setMp4Url(`/api/jobs/${jobId}/download`);
      if ("planReady" in event && event.planReady) setStatus("awaiting_assets");
      else setStatus("completed");
    }
    if (event.type === "error") {
      setError(event.message);
      setStatus("failed");
    }
  }, [jobId]);

  const prepareContinue = useCallback((hasPlan: boolean) => {
    setError(null);
    startRef.current = Date.now();
    stepStartedAtRef.current = Date.now();
    setElapsedMs(0);
    setRunningElapsedMs(0);
    setStatus(hasPlan ? "generating_voiceover" : "reading_article");
    setSteps(resetStepsForContinue(hasPlan));
  }, []);

  const markFailedLocal = useCallback((message: string) => {
    setError(message);
    setStatus("failed");
    setSteps((prev) =>
      prev.map((s) => (s.state === "running" ? { ...s, state: "failed" as const } : s)),
    );
  }, []);

  useEffect(() => {
    startRef.current = Date.now();
    stepStartedAtRef.current = Date.now();
    hydratedRef.current = false;
    const t = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
      setRunningElapsedMs(Date.now() - stepStartedAtRef.current);
    }, 250);
    return () => clearInterval(t);
  }, [jobId]);

  useEffect(() => {
    let cancelled = false;
    void getJob(jobId).then((j) => {
      if (cancelled) return;
      if (j.plan) setPlan(j.plan);
      if (j.error) setError(j.error);
      else setError(null);
      const mapped = mapServerStatus(j.status);
      if (mapped) setStatus(mapped);
      setSteps((prev) => {
        const untouched = prev.every((s) => s.state === "pending");
        if (!untouched || hydratedRef.current) return prev;
        hydratedRef.current = true;
        return hydrateStepsFromJob({
          status: j.status,
          stage: j.stage,
          hasPlan: Boolean(j.plan),
        });
      });
      if (!hydratedRef.current) hydratedRef.current = true;
      if (j.artifacts?.mp4Path) setMp4Url(`/api/jobs/${jobId}/download`);
      if (j.craftReport) {
        setCraftReport({
          pass: j.craftReport.pass,
          score: j.craftReport.score,
          reasons: j.craftReport.reasons ?? [],
          rewritten: j.craftReport.rewritten,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // Poll job meta while running so status stays in sync even if an SSE event is missed.
  useEffect(() => {
    const busy =
      status !== "awaiting_assets" && status !== "completed" && status !== "failed";
    if (!busy) return;
    const t = setInterval(() => {
      void getJob(jobId)
        .then((j) => {
          const mapped = mapServerStatus(j.status);
          if (mapped) setStatus(mapped);
          if (j.plan) setPlan(j.plan);
          if (j.status === "failed" && j.error) setError(j.error);
          if (j.status !== "failed") setError(null);
          if (j.artifacts?.mp4Path) setMp4Url(`/api/jobs/${jobId}/download`);
        })
        .catch(() => {
          /* ignore transient poll errors */
        });
    }, 1500);
    return () => clearInterval(t);
  }, [jobId, status]);

  useEffect(() => {
    const es = new EventSource(jobEventsUrl(jobId));
    es.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as WorkerEvent;
        applyEvent(event);
      } catch {
        const parsed = parseWorkerEventLine(msg.data);
        if (parsed) applyEvent(parsed);
      }
    };
    es.onerror = () => {
      /* browser reconnects automatically */
    };
    return () => es.close();
  }, [jobId, applyEvent]);

  const liveMessage = useMemo(() => {
    if (logs.length) return logs[logs.length - 1];
    return null;
  }, [logs]);

  const progressPercent = useMemo(
    () =>
      deriveProgressPercent(steps, {
        runningElapsedMs: status === "failed" || status === "completed" ? 0 : runningElapsedMs,
      }),
    [steps, status, runningElapsedMs],
  );

  return {
    steps,
    status,
    plan,
    logs,
    error,
    mp4Url,
    craftReport,
    elapsedMs,
    progressPercent,
    liveMessage,
    setPlan,
    prepareContinue,
    markFailedLocal,
  };
}
