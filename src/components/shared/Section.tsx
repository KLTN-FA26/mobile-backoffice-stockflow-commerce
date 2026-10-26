import { View } from "react-native";

import { Text } from "@/components/ui";

import { Card } from "./Card";

import type { ReactNode } from "react";

export type SectionProps = {
  title: string;
  /** Sits at the right of the title: an edit button, a count. */
  action?: ReactNode;
  children: ReactNode;
};

/** A card with a title: the building block of detail and form screens. */
export function Section({ title, action, children }: SectionProps) {
  return (
    <Card>
      <View className="flex-row items-center justify-between gap-3 px-4 pt-3">
        <Text accessibilityRole="header" weight="semibold" className="min-w-0 flex-1">
          {title}
        </Text>
        {action}
      </View>
      <View className="px-4 pb-3 pt-1">{children}</View>
    </Card>
  );
}
