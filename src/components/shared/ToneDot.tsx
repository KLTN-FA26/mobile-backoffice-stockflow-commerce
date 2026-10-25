import { View } from "react-native";

import { cn } from "@/lib/utils";

import { Text } from "@/components/ui";

import type { SemanticTone } from "@/lib/domain/status-types";

export type DotSize = "sm" | "md";

export type ToneDotProps = {
  tone: SemanticTone;
  label: string;
  size?: DotSize;
};

// Same mapping as the web StatusDot: the bright `dot-*` tokens for the five coloured tones, and
// the tone's own colour for neutral and muted, which have no brighter dot variant.
const TONE_DOT_CLASS: Record<SemanticTone, string> = {
  positive: "bg-dot-positive",
  info: "bg-dot-info",
  warning: "bg-dot-warning",
  danger: "bg-dot-danger",
  special: "bg-dot-special",
  neutral: "bg-neutral",
  muted: "bg-muted",
};

/** Lets a test find the dot, which screen readers skip (so no role or text to query it by). */
export const TONE_DOT_TEST_ID = "tone-dot";

const DOT_SIZE_CLASS: Record<DotSize, string> = { sm: "h-2.5 w-2.5", md: "h-3 w-3" };
const LABEL_VARIANT = { sm: "meta", md: "body" } as const;

/** A coloured dot with a label. For record status use `StatusDot`, which picks the tone itself. */
export function ToneDot({ tone, label, size = "sm" }: ToneDotProps) {
  return (
    <View className="flex-row items-center gap-2 self-start">
      <View
        testID={TONE_DOT_TEST_ID}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className={cn("shrink-0 rounded-full", DOT_SIZE_CLASS[size], TONE_DOT_CLASS[tone])}
      />
      <Text variant={LABEL_VARIANT[size]} weight="medium">
        {label}
      </Text>
    </View>
  );
}
