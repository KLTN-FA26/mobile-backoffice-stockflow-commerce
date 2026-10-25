import { Toaster, toast as sonner } from "sonner-native";

type ToastTone = "success" | "error" | "warning" | "info";

function fire(tone: ToastTone, title: string, description?: string): void {
  if (description === undefined) sonner[tone](title);
  else sonner[tone](title, { description });
}

/**
 * Same entry point as the web toast (`@/components/shared/Toast`): `query-factory.ts` loads it by
 * that path. Render <ToastProvider /> once in the root layout.
 */
export function ToastProvider() {
  return <Toaster position="top-center" />;
}

export const toast = {
  success: (title: string, description?: string) => fire("success", title, description),
  error: (title: string, description?: string) => fire("error", title, description),
  warning: (title: string, description?: string) => fire("warning", title, description),
  info: (title: string, description?: string) => fire("info", title, description),
};
