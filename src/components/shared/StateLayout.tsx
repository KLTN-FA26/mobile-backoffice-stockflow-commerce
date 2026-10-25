import { View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";

import { Text } from "@/components/ui";

import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";

export type StateLayoutProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Between the icon and the title, e.g. the "coming soon" tag. */
  aboveTitle?: ReactNode;
  /** Under the description: buttons, a trace id. */
  children?: ReactNode;
};

const ICON_SIZE = 24;

/** The centred icon / title / description stack that empty, error and coming-soon states share. */
export function StateLayout({
  icon: Icon,
  title,
  description,
  aboveTitle,
  children,
}: StateLayoutProps) {
  const colors = useThemeColors();

  return (
    <View className="flex-1 items-center justify-center gap-3 px-6 py-12">
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="h-12 w-12 items-center justify-center rounded-full bg-bg-muted"
      >
        <Icon size={ICON_SIZE} color={colors["ink-tertiary"]} />
      </View>
      {aboveTitle}
      <Text variant="title" className="text-center">
        {title}
      </Text>
      {description === undefined ? null : (
        <Text variant="meta" tone="secondary" className="text-center">
          {description}
        </Text>
      )}
      {children}
    </View>
  );
}
