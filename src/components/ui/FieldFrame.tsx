import { View } from "react-native";

import { cn } from "@/lib/utils";

import { Text } from "./Text";

import type { ReactNode } from "react";

export type FieldFrameProps = {
  label?: string;
  /** Shown under the field as an alert, and replaces the hint. */
  error?: string;
  hint?: string;
  /** Applied to the whole block (label, field and message), so it positions the whole control. */
  className?: string;
  children: ReactNode;
};

/** The label above and the message under a form control: `Input` and `DateField` share it. */
export function FieldFrame({ label, error, hint, className, children }: FieldFrameProps) {
  return (
    <View className={cn("gap-[4px]", className)}>
      {label ? (
        <Text variant="meta" weight="medium" tone="secondary">
          {label}
        </Text>
      ) : null}
      {children}
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          variant="meta"
          tone="danger"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text variant="meta" tone="secondary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
