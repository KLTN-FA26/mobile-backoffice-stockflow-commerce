import { useState } from "react";
import { View } from "react-native";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { cn } from "@/lib/utils";

import { FieldFrame } from "./FieldFrame";
import { TextField } from "./SheetTextInput";

import type { ReactNode, Ref } from "react";
import type { TextInputInstance, TextInputProps } from "react-native";

export type InputProps = TextInputProps & {
  label?: string;
  /** Shown under the field as an alert, and replaces the hint. */
  error?: string;
  hint?: string;
  /** Applied to the wrapper (label, field and message), so it positions the whole control. */
  className?: string;
  /** A control beside the field, on its row and above the message (a show-password button). */
  trailing?: ReactNode;
  ref?: Ref<TextInputInstance>;
};

/** Form controls are 48px tall (N4); a multiline field starts at 96px. */
export const INPUT_HEIGHT = 48;
export const TEXTAREA_MIN_HEIGHT = 96;

export function Input({
  label,
  error,
  hint,
  className,
  accessibilityLabel,
  accessibilityHint,
  editable = true,
  multiline = false,
  onFocus,
  onBlur,
  style,
  ref,
  trailing,
  ...rest
}: InputProps) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);

  // The message below the field is a separate element: put it (the error, else the hint) in the
  // field's own hint too, so a screen reader says it when the field takes focus.
  const fieldHint = [accessibilityHint, error ?? hint].filter(Boolean).join(". ") || undefined;
  const borderClass = error ? "border-danger" : focused ? "border-brand" : "border-border-default";

  const field = (
    <TextField
      ref={ref}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={fieldHint}
      editable={editable}
      multiline={multiline}
      placeholderTextColor={colors["ink-tertiary"]}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        { minHeight: multiline ? TEXTAREA_MIN_HEIGHT : INPUT_HEIGHT },
        multiline && { paddingVertical: 12, textAlignVertical: "top" },
        style,
      ]}
      className={cn(
        "rounded-md border bg-bg-surface px-[12px] font-sans text-[15px] text-ink-primary",
        borderClass,
        !editable && "opacity-50",
        trailing !== undefined && "min-w-0 flex-1",
      )}
      {...rest}
    />
  );

  return (
    <FieldFrame label={label} error={error} hint={hint} className={className}>
      {trailing === undefined ? (
        field
      ) : (
        <View className="flex-row gap-[8px]">
          {field}
          {trailing}
        </View>
      )}
    </FieldFrame>
  );
}
