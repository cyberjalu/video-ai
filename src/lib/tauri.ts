import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import type { RenderOptions } from "./types";

export async function startRender(params: { url?: string; prompt?: string; geminiApiKey: string; options: RenderOptions }) {
  await invoke("start_render", {
    url: params.url,
    prompt: params.prompt,
    geminiApiKey: params.geminiApiKey,
    options: params.options,
  });
}

export async function readTextFileSafe(filePath: string) {
  return invoke<string>("read_text_file", { path: filePath });
}

export function toAssetSrc(filePath: string) {
  return convertFileSrc(filePath);
}

