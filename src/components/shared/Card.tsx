import { Pressable, View } from "react-native";

import { SHADOW_SM } from "@/lib/tokens";
import { cn } from "@/lib/utils";

import type { ViewProps } from "react-native";

export type CardProps = Omit<ViewProps, "style" | "hitSlop"> & {
  /** Padding, margins, gaps: the card look itself is fixed. */
  className?: string;
  /** Makes the whole card one button (role `button`, a tint while pressed), e.g. to open a record. */
  onPress?: () => void;
};

/** The card look: radius 8, default border, surface background (both themes through tokens). */
export const CARD_CLASS = "rounded-md border border-border-default bg-bg-surface";

/**
 * A card-shaped block with the card shadow (`--sh-sm`): what `Section`, `RecordCard`, the hub menu
 * and the account cards are made of. Accessibility props go to the card itself.
 */
export function Card({ className, onPress, children, ...rest }: CardProps) {
  if (onPress === undefined) {
    return (
      <View {...rest} className={cn(CARD_CLASS, className)} style={SHADOW_SM}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      onPress={onPress}
      className={cn(CARD_CLASS, "active:bg-bg-subtle", className)}
      style={SHADOW_SM}
    >
      {children}
    </Pressable>
  );
}
