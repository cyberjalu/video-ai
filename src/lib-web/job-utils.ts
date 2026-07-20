import type { VideoPlan } from "@/lib/domain/types";

export function toJobAssetUrl(jobId: string, filePath?: string | null): string | null {
  if (!filePath) return null;
  const name = filePath.split(/[/\\]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return null;
  const sceneId = name.slice(0, dot);
  const ext = name.slice(dot + 1);
  return `/api/jobs/${jobId}/assets/${sceneId}/${ext}`;
}

export function buildCaptionText(plan: VideoPlan): string {
  const lines = plan.scenes
    .flatMap((s) => s.caption_lines ?? [])
    .filter(Boolean)
    .slice(0, 6);
  return [plan.title, ...lines].filter(Boolean).join("\n");
}
