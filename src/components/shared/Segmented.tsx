import { Pressable, View } from "react-native";

import { CONTROL_HEIGHT } from "@/lib/tokens";
import { cn } from "@/lib/utils";

import { Text } from "@/components/ui";

export type SegmentedOption<T extends string> = { value: T; label: string };

export type SegmentedProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
};

/** Two to four views of the same data side by side (e.g. "Đang làm" / "Đã xong"). */
export function Segmented<T extends string>({ options, value, onValueChange }: SegmentedProps<T>) {
  return (
    <View accessibilityRole="tablist" className="flex-row gap-[2px] rounded-md bg-bg-muted p-[2px]">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) onValueChange(option.value);
            }}
            style={{ minHeight: CONTROL_HEIGHT.md }}
            // rounded-[6px]: the track is rounded-md (8) with a 2px inset, so the nested radius is 8 - 2.
            className={cn(
              "flex-1 items-center justify-center rounded-[6px] border px-3",
              selected ? "border-border-default bg-bg-surface" : "border-transparent",
            )}
          >
            <Text
              variant="meta"
              weight={selected ? "semibold" : "medium"}
              tone={selected ? "primary" : "secondary"}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
