import { ActivityIndicator, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";

import { Text } from "@/components/ui";

export type CenteredSpinnerProps = {
  /** A visible line under the spinner, announced when it appears. */
  message?: string;
  /** What screen readers hear when there is no visible message. */
  accessibilityLabel?: string;
};

/**
 * A whole-screen wait between app states (verifying the session, choosing the start hub) — not a
 * screen's first data load, which shows a skeleton of its own shape.
 */
export function CenteredSpinner({ message, accessibilityLabel }: CenteredSpinnerProps) {
  const colors = useThemeColors();

  return (
    <View className="flex-1 items-center justify-center gap-[12px] bg-bg-base px-[24px]">
      {message === undefined ? (
        <ActivityIndicator color={colors["ink-tertiary"]} accessibilityLabel={accessibilityLabel} />
      ) : (
        <>
          {/* The message says it all; the spinner itself stays out of the screen reader's way. */}
          <ActivityIndicator
            color={colors["ink-tertiary"]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <Text tone="secondary" accessibilityLiveRegion="polite">
            {message}
          </Text>
        </>
      )}
    </View>
  );
}
