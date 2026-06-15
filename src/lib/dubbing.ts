import { invoke } from "@tauri-apps/api/core";

export async function runDubWorker(params: {
  action: "extract" | "transcribe" | "tts" | "merge";
  videoPath?: string;
  audioPath?: string;
  text?: string;
  geminiKey?: string;
  outDir?: string;
  voice?: string;
  mode?: "replace" | "duck";
  duckLevel?: number;
}) {
  await invoke("run_dub_worker", {
    action: params.action,
    videoPath: params.videoPath,
    audioPath: params.audioPath,
    text: params.text,
    geminiKey: params.geminiKey,
    outDir: params.outDir,
    voice: params.voice,
    mode: params.mode,
    duckLevel: params.duckLevel,
  });
}

export type TranscriptSegment = {
  id: string;
  text: string;
};
