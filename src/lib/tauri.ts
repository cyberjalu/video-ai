import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import type { RenderOptions, VideoPlan } from "./types";

export async function startRender(params: {
  url?: string;
  prompt?: string;
  audioPath?: string;
  script?: string;
  platform?: string;
  geminiApiKey: string;
  pexelsApiKey?: string;
  options: RenderOptions;
  stage?: "plan" | "render" | "full";
  projectDir?: string;
  planFile?: string;
}) {
  await invoke("start_render", {
    url: params.url,
    prompt: params.prompt,
    audioPath: params.audioPath,
    script: params.script,
    platform: params.platform,
    geminiApiKey: params.geminiApiKey,
    pexelsApiKey: params.pexelsApiKey,
    options: params.options,
    stage: params.stage ?? "full",
    projectDir: params.projectDir,
    planFile: params.planFile,
  });
}

export async function cancelRender() {
  return invoke("cancel_render");
}

export async function cancelDub() {
  return invoke("cancel_dub");
}

export async function readTextFileSafe(filePath: string) {
  return invoke<string>("read_text_file", { path: filePath });
}

export async function listOutputDirs() {
  return invoke<string[]>("list_output_dirs");
}

export async function pathExists(filePath: string) {
  return invoke<boolean>("path_exists", { path: filePath });
}

export async function copySceneAsset(projectDir: string, sceneId: string, sourcePath: string) {
  return invoke<string>("copy_scene_asset", {
    projectDir,
    sceneId,
    sourcePath,
  });
}

export async function writePlanJson(projectDir: string, plan: VideoPlan) {
  return invoke("write_plan_json", {
    projectDir,
    planJson: JSON.stringify(plan, null, 2),
  });
}

export async function clearSceneAsset(projectDir: string, sceneId: string) {
  return invoke("clear_scene_asset", { projectDir, sceneId });
}

/** Invalidate cached TTS so the next render regenerates voiceover from the edited script. */
export async function clearTtsCache(projectDir: string) {
  return invoke("clear_tts_cache", { projectDir });
}

export function toAssetSrc(filePath: string) {
  return convertFileSrc(filePath);
}
