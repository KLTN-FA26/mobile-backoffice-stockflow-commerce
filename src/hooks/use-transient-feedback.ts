import { useEffect, useState } from "react";

import { SCAN_MOBILE_LIMITS } from "@/constants/mobile";

import type { ScanFeedback } from "@/lib/platform/feedback-effects";

export type TransientFeedback = {
  feedback: ScanFeedback | null;
  /** Shows a result: a positive one goes after `positiveFeedbackMs`, a danger one stays. */
  show: (next: ScanFeedback) => void;
  clear: () => void;
};

/**
 * A scan result on screen with the web's timing: right fades after `positiveFeedbackMs`, wrong
 * stays until the next result. One pending timer at most, dropped by the next result, by `clear`
 * and on unmount. `show` and `clear` keep their identity for the life of the component, so an
 * effect may depend on them. Display only: the tone, vibration and announcement are
 * `useScanFeedback`'s.
 */
export function useTransientFeedback(): TransientFeedback {
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [control] = useState(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      clearTimeout(timer);
      timer = undefined;
    };
    return {
      stop,
      show(next: ScanFeedback) {
        stop();
        setFeedback(next);
        if (next.tone === "positive") {
          timer = setTimeout(() => {
            timer = undefined;
            setFeedback(null);
          }, SCAN_MOBILE_LIMITS.positiveFeedbackMs);
        }
      },
      clear() {
        stop();
        setFeedback(null);
      },
    };
  });

  useEffect(() => control.stop, [control]);

  return { feedback, show: control.show, clear: control.clear };
}
