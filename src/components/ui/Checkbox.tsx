import { Check } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { CONTROL_HEIGHT } from "@/lib/tokens";
import { cn } from "@/lib/utils";

import { Text } from "./Text";

export type CheckboxProps = {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
};

export const CHECKBOX_BOX_TEST_ID = "checkbox-box";

/** The box alone: for a row that is itself the button (e.g. a multiple-choice option). */
export function CheckboxBox({ checked }: { checked: boolean }) {
  const colors = useThemeColors();

  return (
    <View
      testID={CHECKBOX_BOX_TEST_ID}
      className={cn(
        "h-[22px] w-[22px] items-center justify-center rounded-sm border",
        checked ? "border-brand bg-brand" : "border-border-strong bg-bg-surface",
      )}
    >
      {checked ? <Check size={14} strokeWidth={3} color={colors["ink-inverse"]} /> : null}
    </View>
  );
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className,
}: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      style={{ minHeight: CONTROL_HEIGHT.md }}
      className={cn(
        "flex-row items-center gap-[12px] py-[8px]",
        disabled && "opacity-50",
        className,
      )}
    >
      <CheckboxBox checked={checked} />
      <Text className="flex-1">{label}</Text>
    </Pressable>
  );
}
