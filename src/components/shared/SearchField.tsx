import { Search, X } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { CONTROL_HEIGHT } from "@/lib/tokens";
import { cn } from "@/lib/utils";

import { IconButton, TextField } from "@/components/ui";

import type { ReactNode } from "react";

export type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  /** Also the field's accessibility label, unless `accessibilityLabel` says otherwise. */
  placeholder: string;
  accessibilityLabel?: string;
  /** The keyboard's search key. Typing alone already reports through `onChangeText`. */
  onSubmit?: () => void;
  /** After the clear button, e.g. a camera button for codes. */
  trailing?: ReactNode;
};

/** The search box at the top of a list: 44px, magnifier on the left, clear button once it has text. */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  onSubmit,
  trailing,
}: SearchFieldProps) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={{ height: CONTROL_HEIGHT.md }}
      className={cn(
        "flex-row items-center rounded-md border bg-bg-surface pl-[12px]",
        focused ? "border-brand" : "border-border-default",
      )}
    >
      <Search size={16} color={colors["dot-info"]} />
      <TextField
        accessibilityRole="search"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colors["ink-tertiary"]}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        className="h-full min-w-0 flex-1 px-[8px] font-sans text-[15px] text-ink-primary"
      />
      {value.length > 0 ? (
        // The box is 44px with a 1px border: the 42px inside, and a pixel of touch on each side.
        <IconButton
          icon={X}
          accessibilityLabel={MOBILE_LABELS.clearSearch}
          onPress={() => onChangeText("")}
          size={CONTROL_HEIGHT.md - 2}
          iconSize={16}
          iconColor="ink-secondary"
        />
      ) : null}
      {trailing}
    </View>
  );
}
