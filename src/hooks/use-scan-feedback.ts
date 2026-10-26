import { useState } from "react";
import { AccessibilityInfo } from "react-native";

import { playScanTone, scanHaptic } from "@/lib/platform/feedback-effects";
import { useAppStore } from "@/lib/store/use-app-store";

import { useTransientFeedback } from "./use-transient-feedback";

import type { ScanFeedback } from "@/lib/platform/feedback-effects";

export type ScanFeedbackState = {
  feedback: ScanFeedback | null;
  /** Shows a scan's result, with its tone, vibration and screen-reader announcement. */
  show: (next: ScanFeedback) => void;
  clear: () => void;
};

/**
 * The result of the latest scan, with the web's meaning: right → green, gone after
 * `positiveFeedbackMs`; wrong → red until the next scan (the worker may not be looking at that
 * moment). Each `show` also plays the tone unless the app is muted, vibrates when vibration is on
 * (both read when the scan happens) and has the screen reader say the message. `show` and `clear`
 * keep their identity for the life of the component (as `useTransientFeedback`'s), so an effect or
 * a scan subscription may depend on them.
 */
export function useScanFeedback(): ScanFeedbackState {
  const { feedback, show: display, clear } = useTransientFeedback();

  // `display` is stable, so the first render's closure stays right for good.
  const [show] = useState(() => (next: ScanFeedback) => {
    display(next);
    const { muted, hapticsEnabled } = useAppStore.getState();
    if (!muted) playScanTone(next.tone);
    if (hapticsEnabled) scanHaptic(next.tone);
    AccessibilityInfo.announceForAccessibility(next.message);
  });

  return { feedback, show, clear };
}
