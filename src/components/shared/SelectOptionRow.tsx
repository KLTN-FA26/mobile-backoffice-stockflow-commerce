import { Check } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { cn } from "@/lib/utils";

import { CheckboxBox, Text } from "@/components/ui";

export type SelectOptionRowProps = {
  label: string;
  description?: string;
  selected: boolean;
  disabled?: boolean;
  /** A checkbox among several, rather than a radio among one. */
  multiple: boolean;
  onPress: () => void;
};

const ROW_HEIGHT = 48;

/**
 * One choice in a `SelectSheet`: the label and a second line if it has one. A single choice shows a
 * tick on the right when chosen; one of several shows a checkbox on the left, ticked or empty.
 */
export function SelectOptionRow({
  label,
  description,
  selected,
  disabled = false,
  multiple,
  onPress,
}: SelectOptionRowProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole={multiple ? "checkbox" : "radio"}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: ROW_HEIGHT }}
      className={cn(
        "flex-row items-center gap-[12px] rounded-md px-[8px] py-[8px] active:bg-bg-subtle",
        disabled && "opacity-50",
      )}
    >
      {multiple ? <CheckboxBox checked={selected} /> : null}
      <View className="min-w-0 flex-1">
        <Text weight={selected ? "semibold" : "regular"}>{label}</Text>
        {description ? (
          <Text variant="meta" tone="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      {!multiple && selected ? <Check size={18} color={colors["ink-primary"]} /> : null}
    </Pressable>
  );
}
