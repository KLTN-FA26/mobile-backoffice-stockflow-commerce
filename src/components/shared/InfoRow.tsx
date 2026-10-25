import { View } from "react-native";

import { Text } from "@/components/ui";

import { SlotText } from "./SlotText";

import type { ReactNode } from "react";

export type InfoRowProps = {
  label: string;
  value: ReactNode;
  /** Codes, SKUs and quantities: JetBrains Mono with tabular figures. */
  mono?: boolean;
};

/** One "label — value" line of a detail card; the value sits on the right edge. */
export function InfoRow({ label, value, mono = false }: InfoRowProps) {
  // A plain value reads as one stop ("label, value"); a node value may hold controls, so it stays
  // separate for the screen reader.
  const isText = typeof value === "string" || typeof value === "number";

  return (
    <View accessible={isText} className="flex-row items-start justify-between gap-4 py-2">
      <Text variant="meta" tone="secondary" className="max-w-[45%]">
        {label}
      </Text>
      <View className="min-w-0 flex-1 items-end">
        <SlotText mono={mono} numeric={mono} className="text-right">
          {value}
        </SlotText>
      </View>
    </View>
  );
}
