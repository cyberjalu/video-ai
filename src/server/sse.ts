import type { WorkerEvent } from "@/lib/domain/types";

type Listener = (event: WorkerEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribeJobEvents(jobId: string, listener: Listener): () => void {
  let set = listeners.get(jobId);
  if (!set) {
    set = new Set();
    listeners.set(jobId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) listeners.delete(jobId);
  };
}

export function publishJobEvent(jobId: string, event: WorkerEvent) {
  const set = listeners.get(jobId);
  if (set) {
    for (const fn of set) fn(event);
  }
}

export function formatSseData(event: WorkerEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createSseStream(jobId: string, signal?: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const send = (event: WorkerEvent) => {
        controller.enqueue(encoder.encode(formatSseData(event)));
      };
      const unsub = subscribeJobEvents(jobId, send);
      controller.enqueue(encoder.encode(`: connected job=${jobId}\n\n`));

      signal?.addEventListener("abort", () => {
        unsub();
        controller.close();
      });
    },
    cancel() {
      /* unsub handled via abort */
    },
  });
}
