"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyWorkerEventToSteps,
  deriveProgressPercent,
  initialSteps,
  type UiStep,
} from "@/lib/domain/generation";
import type { GenerationStatus, VideoPlan, WorkerEvent } from "@/lib/domain/types";
import { parseWorkerEventLine } from "@/lib/domain/workerEvents";
import { getJob, jobEventsUrl } from "@/lib/api-client";

export function useJob(jobId: string) {
  const [steps, setSteps] = useState<UiStep[]>(initialSteps);
  const [status, setStatus] = useState<GenerationStatus>("reading_article");
  const [plan, setPlan] = useState<VideoPlan | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mp4Url, setMp4Url] = useState<string | null>(null);
  const startRef = useRef<number>(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);

  const applyEvent = useCallback((event: WorkerEvent) => {
    setSteps((prev) => {
      const { steps: next, status: newStatus } = applyWorkerEventToSteps(prev, event);
      if (newStatus) setStatus(newStatus);
      return next;
    });
    if (event.type === "log") setLogs((p) => [...p, event.message]);
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

  useEffect(() => {
    startRef.current = Date.now();
    const t = setInterval(() => setElapsedMs(Date.now() - startRef.current), 500);
    return () => clearInterval(t);
  }, [jobId]);

  useEffect(() => {
    void getJob(jobId).then((j) => {
      if (j.plan) setPlan(j.plan);
      if (j.status === "awaiting_review") setStatus("awaiting_assets");
      if (j.status === "completed") setStatus("completed");
      if (j.status === "failed") setStatus("failed");
      if (j.artifacts?.mp4Path) setMp4Url(`/api/jobs/${jobId}/download`);
    });
  }, [jobId]);

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

  return {
    steps,
    status,
    plan,
    logs,
    error,
    mp4Url,
    elapsedMs,
    progressPercent: deriveProgressPercent(steps),
    setPlan,
  };
}
