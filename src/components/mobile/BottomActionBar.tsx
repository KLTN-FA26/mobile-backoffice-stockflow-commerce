import { BottomTabBarHeightContext } from "expo-router/js-tabs";
import { Ellipsis } from "lucide-react-native";
import { useContext } from "react";
import { View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";

import { Button, Text } from "@/components/ui";

import type { ButtonProps } from "@/components/ui";

export type BottomActionBarProps = {
  /** The one main action, full width at the bottom (thumb zone). */
  primary?: ButtonProps;
  /** Secondary or destructive actions, in a row above the main one. */
  secondary?: ButtonProps[];
  /**
   * Why the main action is locked, in the web's words. Shown right under it (no hover on a phone:
   * N7) and read with it by screen readers.
   */
  disabledReason?: string;
  /** Opens the "more actions" sheet for everything else. */
  more?: { label: string; onPress: () => void };
};

const BAR_PADDING = 12;

export const BOTTOM_ACTION_BAR_TEST_ID = "bottom-action-bar";

/**
 * The actions of a detail, form or station screen, stuck to the bottom (N3). Above a tab bar, which
 * already clears the home indicator, it adds only its own padding; with no tab bar below it (a
 * screen outside the tabs) it takes the bottom inset itself.
 */
export function BottomActionBar({
  primary,
  secondary = [],
  disabledReason,
  more,
}: BottomActionBarProps) {
  const insets = useContext(SafeAreaInsetsContext);
  // React Navigation's tab bar height for this scene: undefined outside the tabs, 0 when the bar
  // is not at the bottom (a tab bar hidden with `display: "none"` still needs a device check).
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const bottomInset = tabBarHeight > 0 ? 0 : (insets?.bottom ?? 0);
  const hasRow = secondary.length > 0 || more !== undefined;

  return (
    <View
      testID={BOTTOM_ACTION_BAR_TEST_ID}
      style={{ paddingTop: BAR_PADDING, paddingBottom: BAR_PADDING + bottomInset }}
      className="gap-[8px] border-t border-border-default bg-bg-surface px-[16px]"
    >
      {hasRow ? (
        <View className="flex-row gap-[8px]">
          {secondary.map((action) => (
            <Button
              key={action.label}
              variant="secondary"
              {...action}
              className={cn("flex-1", action.className)}
            />
          ))}
          {more === undefined ? null : (
            <Button variant="ghost" icon={Ellipsis} label={more.label} onPress={more.onPress} />
          )}
        </View>
      ) : null}
      {primary === undefined ? null : (
        <Button {...primary} accessibilityHint={disabledReason ?? primary.accessibilityHint} />
      )}
      {disabledReason === undefined ? null : (
        <Text variant="meta" tone="secondary" accessibilityLiveRegion="polite">
          {disabledReason}
        </Text>
      )}
    </View>
  );
}
