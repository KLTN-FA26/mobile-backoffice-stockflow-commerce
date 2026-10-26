import { AccessibilityInfo, Platform } from "react-native";
import { toast as sonner } from "sonner-native";

type ToastTone = "success" | "error" | "warning" | "info";

function fire(tone: ToastTone, title: string, description?: string): void {
  if (description === undefined) sonner[tone](title);
  else sonner[tone](title, { description });
  // Android reads the toast's live region; iOS has none, so it is said here.
  if (Platform.OS === "ios") {
    AccessibilityInfo.announceForAccessibility(
      description === undefined ? title : `${title}. ${description}`,
    );
  }
}

/**
 * Same entry point as the web toast (`@/components/shared/Toast`): `query-factory.ts` requires it
 * by that path from inside its callbacks. It stays this light on purpose — the Toaster and its
 * icons live in `ToastProvider.tsx` (the icon library alone takes seconds to load), so the first
 * toast a mutation fires does not pay for them. Render <ToastProvider /> once, in `AppProviders`.
 */
export const toast = {
  success: (title: string, description?: string) => fire("success", title, description),
  error: (title: string, description?: string) => fire("error", title, description),
  warning: (title: string, description?: string) => fire("warning", title, description),
  info: (title: string, description?: string) => fire("info", title, description),
};
