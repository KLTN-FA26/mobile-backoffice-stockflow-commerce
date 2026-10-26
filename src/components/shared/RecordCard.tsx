import { View } from "react-native";

import { Text } from "@/components/ui";

import { Card } from "./Card";
import { SlotText } from "./SlotText";

import type { ReactNode } from "react";

export type RecordCardProps = {
  /** The record code or name. */
  title: string;
  titleMono?: boolean;
  /** Top right: a `StatusDot`. */
  status?: ReactNode;
  /** The related party or object. */
  subtitle?: ReactNode;
  /** Bottom left: a date. */
  meta?: ReactNode;
  /** Bottom right: a quantity or amount, right-aligned with tabular figures. */
  metaRight?: ReactNode;
  /** Makes the whole card a button, e.g. to open the record. */
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** A list row as a card: code and status, related party, date and quantity. */
export function RecordCard({
  title,
  titleMono = false,
  status,
  subtitle,
  meta,
  metaRight,
  onPress,
  accessibilityLabel,
}: RecordCardProps) {
  const body = (
    <View className="gap-1">
      <View className="flex-row items-start justify-between gap-3">
        <Text weight="semibold" mono={titleMono} className="min-w-0 flex-1">
          {title}
        </Text>
        {status === undefined ? null : (
          // Capped so a revealed "nhãn Việt — status" wraps in its column instead of crushing the title.
          <View className="max-w-[60%] shrink-0">{status}</View>
        )}
      </View>
      {subtitle === undefined ? null : (
        <SlotText variant="meta" tone="secondary">
          {subtitle}
        </SlotText>
      )}
      {meta === undefined && metaRight === undefined ? null : (
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <SlotText variant="meta" tone="tertiary">
              {meta}
            </SlotText>
          </View>
          <SlotText variant="meta" tone="secondary" numeric className="text-right">
            {metaRight}
          </SlotText>
        </View>
      )}
    </View>
  );

  return (
    <Card
      // A button reads as one element anyway; a plain card only when it has a label to read.
      accessible={onPress !== undefined || accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="p-4"
    >
      {body}
    </Card>
  );
}
