import type { GenerationRequest, VideoPlan } from "@/lib/domain/types";
import { loadSessionGeminiKey, loadSessionPexelsKey } from "@/lib/session-keys";

export async function createJob(body: GenerationRequest) {
  const res = await fetch("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(typeof err.error === "string" ? err.error : "Failed to create job");
  }
  return res.json() as Promise<{
    jobId: string;
    status: string;
    eventsUrl: string;
    reviewUrl: string;
    expiresAt: string;
  }>;
}

export async function getJob(jobId: string) {
  const res = await fetch(`/api/jobs/${jobId}`);
  if (!res.ok) throw new Error("Job not found");
  return res.json() as Promise<{
    id: string;
    templateId: string;
    status: string;
    stage: string | null;
    plan?: VideoPlan;
    artifacts?: { mp4Url?: string; mp4Path?: string };
    error?: string;
    expiresAt: string;
  }>;
}

export async function updatePlan(jobId: string, plan: VideoPlan) {
  const res = await fetch(`/api/jobs/${jobId}/plan`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  });
  if (!res.ok) throw new Error("Failed to save plan");
  return res.json() as Promise<{ ok: boolean; plan: VideoPlan }>;
}

export async function startRender(jobId: string) {
  const res = await fetch(`/api/jobs/${jobId}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keys: { gemini: loadSessionGeminiKey(), pexels: loadSessionPexelsKey() || undefined },
    }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(typeof err.error === "string" ? err.error : "Failed to start render");
  }
  return res.json() as Promise<{ status: string }>;
}

export async function cancelJob(jobId: string) {
  const res = await fetch(`/api/jobs/${jobId}/cancel`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to cancel");
  return res.json() as Promise<{ status: string }>;
}

export async function uploadSceneAsset(jobId: string, sceneId: string, file: File) {
  const form = new FormData();
  form.append("sceneId", sceneId);
  form.append("file", file);
  const res = await fetch(`/api/jobs/${jobId}/assets`, { method: "POST", body: form });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(typeof err.error === "string" ? err.error : "Upload failed");
  }
  return res.json() as Promise<{ sceneId: string; assetUrl: string; plan: VideoPlan }>;
}

export function jobEventsUrl(jobId: string) {
  return `/api/jobs/${jobId}/events`;
}

export function downloadUrl(jobId: string) {
  return `/api/jobs/${jobId}/download`;
}
