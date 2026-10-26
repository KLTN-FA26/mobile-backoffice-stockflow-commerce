import { useEffect } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export type AnnounceOptions = {
  /**
   * Also speak on Android. Leave it off next to an element that carries `accessibilityLiveRegion`
   * (TalkBack already reads that one, so announcing too would say it twice); turn it on when nothing
   * on screen is a live region, e.g. a sheet that has just opened.
   */
  android?: boolean;
};

/**
 * Has the screen reader say `message` when it appears and each time it changes to another text,
 * not at every render; nothing for `null`, `undefined` or `""`. iOS has no live regions, so an
 * error, an alert or a banner that only shows up on screen is never read there without this.
 */
export function useAnnounce(
  message: string | null | undefined,
  { android = false }: AnnounceOptions = {},
): void {
  useEffect(() => {
    if (!message) return;
    if (Platform.OS === "android" && !android) return;
    AccessibilityInfo.announceForAccessibility(message);
  }, [message, android]);
}
