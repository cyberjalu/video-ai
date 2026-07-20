import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data", "jobs");

function dataRoot() {
  return process.env.JOB_DATA_DIR ?? DEFAULT_DATA_DIR;
}

export async function cleanupExpiredJobs(): Promise<number> {
  const root = dataRoot();
  let removed = 0;
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const now = Date.now();
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const metaPath = path.join(root, ent.name, "meta.json");
      try {
        const raw = await fs.readFile(metaPath, "utf-8");
        const meta = JSON.parse(raw) as { expiresAt?: string };
        if (meta.expiresAt && new Date(meta.expiresAt).getTime() < now) {
          await fs.rm(path.join(root, ent.name), { recursive: true, force: true });
          removed += 1;
        }
      } catch {
        /* skip invalid dirs */
      }
    }
  } catch {
    /* data dir missing */
  }
  return removed;
}
