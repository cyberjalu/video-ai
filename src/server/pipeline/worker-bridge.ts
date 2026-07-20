/**
 * Runs the legacy worker subprocess and forwards NDJSON events.
 * Full module extraction from worker/index.ts is tracked in T016–T021.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { parseWorkerEventLine } from "@/lib/domain/workerEvents";
import type { WorkerEvent } from "@/lib/domain/types";

export type WorkerCliArgs = Record<string, string | undefined>;

function tsxPath(cwd: string) {
  return path.join(cwd, "node_modules", "tsx", "dist", "cli.mjs");
}

export function runWorkerProcess(
  args: WorkerCliArgs,
  onEvent: (event: WorkerEvent) => void,
): Promise<number> {
  const cwd = process.cwd();
  const cliArgs = ["./worker/index.ts"];
  for (const [key, value] of Object.entries(args)) {
    if (value == null || value === "") continue;
    cliArgs.push(`--${key}`, value);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxPath(cwd), ...cliArgs], {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString("utf-8").split("\n")) {
        const event = parseWorkerEventLine(line);
        if (event) onEvent(event);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(code ?? 0);
      else reject(new Error(stderr.trim() || `Worker exited with code ${code}`));
    });
  });
}
