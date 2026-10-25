import { Pressable, View } from "react-native";

import { CONTROL_HEIGHT } from "@/lib/tokens";
import { cn } from "@/lib/utils";

import { Text } from "./Text";

export type RadioOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

export type RadioGroupProps<T extends string> = {
  options: readonly RadioOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Names the group for screen readers ("Hình thức giao"); there is no visible label. */
  accessibilityLabel: string;
  className?: string;
};

export function RadioGroup<T extends string>({
  options,
  value,
  onValueChange,
  accessibilityLabel,
  className,
}: RadioGroupProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className={cn("gap-[4px]", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityHint={option.description}
            accessibilityState={{ checked: selected }}
            onPress={() => onValueChange(option.value)}
            style={{ minHeight: CONTROL_HEIGHT.md }}
            className="flex-row items-center gap-[12px] py-[8px]"
          >
            <View
              className={cn(
                "h-[22px] w-[22px] items-center justify-center rounded-full border",
                selected ? "border-brand" : "border-border-strong",
              )}
            >
              {selected ? <View className="h-[12px] w-[12px] rounded-full bg-brand" /> : null}
            </View>
            <View className="flex-1 gap-[2px]">
              <Text>{option.label}</Text>
              {option.description ? (
                <Text variant="meta" tone="secondary">
                  {option.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
