import { COLOR_TOKENS } from "@/lib/tokens";

import { useResolvedScheme } from "@/providers/theme-provider";

import type { ColorToken } from "@/lib/tokens";

/** Hex values of the scheme in effect, for what cannot take a class: icon colours, the status bar. */
export function useThemeColors(): Record<ColorToken, string> {
  return COLOR_TOKENS[useResolvedScheme()];
}
