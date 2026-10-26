import { Pressable, Switch as RNSwitch, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { CONTROL_HEIGHT } from "@/lib/tokens";
import { cn } from "@/lib/utils";

import { Text } from "./Text";

export type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * The whole row is the control (the native switch alone is under 44pt tall), so the row carries the
 * `switch` role and the native one is only drawn: hidden from screen readers and from touches.
 */
export function Switch({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  className,
}: SwitchProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onValueChange(!value)}
      style={{ minHeight: CONTROL_HEIGHT.md }}
      className={cn(
        "flex-row items-center justify-between gap-[12px] py-[8px]",
        disabled && "opacity-50",
        className,
      )}
    >
      <View className="flex-1 gap-[2px]">
        <Text>{label}</Text>
        {description ? (
          <Text variant="meta" tone="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <RNSwitch
          value={value}
          trackColor={{ false: colors["border-strong"], true: colors.brand }}
          // Android's thumb overhangs the track onto the card: the `thumb` token stays visible on
          // the dark card, where the surface colour would vanish.
          thumbColor={colors.thumb}
          ios_backgroundColor={colors["border-strong"]}
        />
      </View>
    </Pressable>
  );
}
