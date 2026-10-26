/**
 * How the scanner route and the field that opened it talk: by the `requestId` of that opening, never
 * by a callback in the route params (params must stay serialisable). Codes flow from the camera to
 * the field; in continuous mode the station's feedback flows back to the camera; and the camera says
 * when it has closed, so the field may open it again.
 *
 * Plain in-memory pub/sub, nothing persisted: a scan only means something to the screen that is open.
 */
import type { ScanFeedback } from "@/lib/platform/feedback-effects";

export type { ScanFeedback } from "@/lib/platform/feedback-effects";

type Listener<T> = (value: T) => void;

function createChannel<T>() {
  const byRequest = new Map<string, Set<Listener<T>>>();

  return {
    publish(requestId: string, value: T): void {
      const listeners = byRequest.get(requestId);
      if (listeners === undefined) return;
      // A copy: a listener may unsubscribe while it is being called (single mode does).
      [...listeners].forEach((listener) => listener(value));
    },
    subscribe(requestId: string, listener: Listener<T>): () => void {
      const listeners = byRequest.get(requestId) ?? new Set<Listener<T>>();
      listeners.add(listener);
      byRequest.set(requestId, listeners);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && byRequest.get(requestId) === listeners) {
          byRequest.delete(requestId);
        }
      };
    },
  };
}

const codes = createChannel<string>();
const feedbacks = createChannel<ScanFeedback>();
const closes = createChannel<undefined>();

let lastRequest = 0;

/** Unique within this run of the app, which is all an in-memory bus needs. */
export function createScanRequestId(): string {
  lastRequest += 1;
  return `scan-${Date.now().toString(36)}-${lastRequest}`;
}

export function publishScan(requestId: string, code: string): void {
  codes.publish(requestId, code);
}

export function subscribeScan(requestId: string, listener: (code: string) => void): () => void {
  return codes.subscribe(requestId, listener);
}

export function publishScanFeedback(requestId: string, feedback: ScanFeedback): void {
  feedbacks.publish(requestId, feedback);
}

export function subscribeScanFeedback(
  requestId: string,
  listener: (feedback: ScanFeedback) => void,
): () => void {
  return feedbacks.subscribe(requestId, listener);
}

/** The scanner screen of this request is gone, however it was closed (button, code, back). */
export function publishScannerClosed(requestId: string): void {
  closes.publish(requestId, undefined);
}

export function subscribeScannerClosed(requestId: string, listener: () => void): () => void {
  return closes.subscribe(requestId, listener);
}
