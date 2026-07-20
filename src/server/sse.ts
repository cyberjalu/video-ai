import type { WorkerEvent } from "@/lib/domain/types";
import { readEvents } from "@/server/jobs/store";

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
        try {
          controller.enqueue(encoder.encode(formatSseData(event)));
        } catch {
          /* closed */
        }
      };

      let unsub = () => {};
      void (async () => {
        controller.enqueue(encoder.encode(`: connected job=${jobId}\n\n`));
        const history = await readEvents(jobId);
        for (const ev of history) {
          send(ev as WorkerEvent);
        }
        unsub = subscribeJobEvents(jobId, send);
      })();

      signal?.addEventListener("abort", () => {
        unsub();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      /* unsub handled via abort */
    },
  });
}
