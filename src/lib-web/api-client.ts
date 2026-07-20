import type { GenerationRequest, VideoPlan } from "@/lib/domain/types";
import { loadSessionGeminiKey, loadSessionPexelsKey } from "@/lib/session-keys";

const TOKEN_PREFIX = "clipnews.jobToken.";

function saveJobToken(jobId: string, token: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_PREFIX + jobId, token);
}

function loadJobToken(jobId: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_PREFIX + jobId);
}

function authHeaders(jobId?: string): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (jobId) {
    const token = loadJobToken(jobId);
    if (token) headers["x-job-token"] = token;
  }
  return headers;
}

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
  const data = (await res.json()) as {
    jobId: string;
    status: string;
    eventsUrl: string;
    reviewUrl: string;
    expiresAt: string;
    jobToken?: string;
  };
  if (data.jobToken) saveJobToken(data.jobId, data.jobToken);
  return data;
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
    captionPack?: {
      title: string;
      description: string;
      hashtags: string[];
      postingTimeHint: string;
      fullCaption: string;
    };
    qc?: { pass: boolean; score: number; reasons: string[] };
    error?: string;
    expiresAt: string;
  }>;
}

export async function updatePlan(jobId: string, plan: VideoPlan) {
  const res = await fetch(`/api/jobs/${jobId}/plan`, {
    method: "PATCH",
    headers: authHeaders(jobId),
    body: JSON.stringify(plan),
  });
  if (!res.ok) throw new Error("Failed to save plan");
  return res.json() as Promise<{ ok: boolean; plan: VideoPlan }>;
}

export async function startRender(jobId: string) {
  const res = await fetch(`/api/jobs/${jobId}/render`, {
    method: "POST",
    headers: authHeaders(jobId),
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
  const res = await fetch(`/api/jobs/${jobId}/cancel`, {
    method: "POST",
    headers: authHeaders(jobId),
  });
  if (!res.ok) throw new Error("Failed to cancel");
  return res.json() as Promise<{ status: string }>;
}

export async function uploadSceneAsset(jobId: string, sceneId: string, file: File) {
  const form = new FormData();
  form.append("sceneId", sceneId);
  form.append("file", file);
  const headers: HeadersInit = {};
  const token = loadJobToken(jobId);
  if (token) (headers as Record<string, string>)["x-job-token"] = token;
  const res = await fetch(`/api/jobs/${jobId}/assets`, { method: "POST", body: form, headers });
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
