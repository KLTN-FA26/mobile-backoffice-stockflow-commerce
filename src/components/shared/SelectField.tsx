import { ChevronDown } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { cn } from "@/lib/utils";

import { FieldFrame, INPUT_HEIGHT, Skeleton, Text } from "@/components/ui";

export type SelectFieldProps = {
  /** Above the field, and its accessibility label. */
  label: string;
  /** What is chosen, as text. Leave it out while nothing is: the placeholder shows instead. */
  valueText?: string;
  placeholder: string;
  /** Opens the choice, usually a `SelectSheet` the screen holds. */
  onPress: () => void;
  /** Shown under the field as an alert, and replaces the hint. */
  error?: string;
  hint?: string;
  disabled?: boolean;
  /** The options are still loading: a placeholder bar, busy, and it cannot be opened yet. */
  loading?: boolean;
  /** Applied to the whole block (label, field and message). */
  className?: string;
};

const ICON_SIZE = 16;

/**
 * The form control in place of a `<select>`: a 48px field (N4) showing the choice, with a chevron,
 * that opens the choice on press. A screen reader hears the label, then the choice as the value,
 * then the hint or the error.
 */
export function SelectField({
  label,
  valueText,
  placeholder,
  onPress,
  error,
  hint,
  disabled = false,
  loading = false,
  className,
}: SelectFieldProps) {
  const colors = useThemeColors();
  const inactive = disabled || loading;
  const shown = valueText ?? placeholder;

  return (
    <FieldFrame label={label} error={error} hint={hint} className={className}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: shown }}
        // The message under the field is a separate element: say it with the field too.
        accessibilityHint={error ?? hint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        onPress={onPress}
        style={{ minHeight: INPUT_HEIGHT }}
        className={cn(
          "flex-row items-center gap-[8px] rounded-md border bg-bg-surface px-[12px] active:bg-bg-subtle",
          error ? "border-danger" : "border-border-default",
          disabled && "opacity-50",
        )}
      >
        {loading ? (
          <View className="min-w-0 flex-1">
            <Skeleton className="h-[16px] w-1/2" />
          </View>
        ) : (
          <Text
            tone={valueText === undefined ? "tertiary" : "primary"}
            numberOfLines={1}
            className="min-w-0 flex-1"
          >
            {shown}
          </Text>
        )}
        <ChevronDown size={ICON_SIZE} color={colors["ink-tertiary"]} />
      </Pressable>
    </FieldFrame>
  );
}
