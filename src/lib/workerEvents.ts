import type { WorkerEvent } from "./types";

export function parseWorkerEventLine(line: string): WorkerEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  try {
    const obj = JSON.parse(trimmed) as { type?: string };
    if (!obj || typeof obj !== "object") return null;
    if (typeof obj.type !== "string") return null;
    return obj as WorkerEvent;
  } catch {
    return null;
  }
}

