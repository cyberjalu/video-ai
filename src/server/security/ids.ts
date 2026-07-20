import path from "node:path";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCENE_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const ALLOWED_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "mp4", "webm", "mov", "mkv"]);

export function assertValidJobId(jobId: string): string {
  if (!UUID_RE.test(jobId)) throw new Error("Invalid job id");
  return jobId;
}

export function assertValidSceneId(sceneId: string): string {
  if (!SCENE_ID_RE.test(sceneId)) throw new Error("Invalid scene id");
  return sceneId;
}

export function assertValidAssetExt(ext: string): string {
  const clean = ext.replace(/^\./, "").toLowerCase();
  if (!ALLOWED_EXTS.has(clean)) throw new Error("Invalid asset extension");
  return clean;
}

export function safeJoinUnder(root: string, ...segments: string[]): string {
  const resolved = path.resolve(root, ...segments);
  const rootResolved = path.resolve(root);
  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + path.sep)) {
    throw new Error("Path traversal blocked");
  }
  return resolved;
}
