import { View } from "react-native";

import { cn } from "@/lib/utils";

import { Text } from "./Text";

import type { SemanticTone } from "@/lib/domain/status-types";

export type BadgeProps = {
  label: string;
  tone?: SemanticTone;
  className?: string;
};

// Text and border take the tone itself, the fill is a tint of it. The brighter `dot-*` tokens are
// for dots and icons only: they are not readable as text.
// Mirrors the web badge recipe (R24); low-contrast tones are a known web-parity trade-off.
const TONE_CLASS: Record<SemanticTone, { box: string; text: string }> = {
  positive: { box: "border-positive bg-positive/10", text: "text-positive" },
  info: { box: "border-info bg-info/10", text: "text-info" },
  warning: { box: "border-warning bg-warning/10", text: "text-warning" },
  danger: { box: "border-danger bg-danger/10", text: "text-danger" },
  neutral: { box: "border-neutral bg-neutral/10", text: "text-neutral" },
  muted: { box: "border-muted bg-muted/10", text: "text-muted" },
  special: { box: "border-special bg-special/10", text: "text-special" },
};

/** A generic tone label. Record status goes through `StatusDot`, never through a hand-made badge. */
export function Badge({ label, tone = "neutral", className }: BadgeProps) {
  const style = TONE_CLASS[tone];

  return (
    <View
      className={cn(
        "flex-row items-center self-start rounded-sm border px-[8px] py-[2px]",
        style.box,
        className,
      )}
    >
      <Text variant="small" weight="medium" className={style.text}>
        {label}
      </Text>
    </View>
  );
}
