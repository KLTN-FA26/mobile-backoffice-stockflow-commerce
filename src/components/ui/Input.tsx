import { useState } from "react";

import { UI_LIMITS } from "@/constants/mobile";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { cn } from "@/lib/utils";

import { FieldFrame } from "./FieldFrame";
import { TextField } from "./SheetTextInput";

import type { Ref } from "react";
import type { TextInputInstance, TextInputProps } from "react-native";

export type InputProps = TextInputProps & {
  label?: string;
  /** Shown under the field as an alert, and replaces the hint. */
  error?: string;
  hint?: string;
  /** Applied to the wrapper (label, field and message), so it positions the whole control. */
  className?: string;
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
  maxFontSizeMultiplier = UI_LIMITS.maxFontSizeMultiplier,
  onFocus,
  onBlur,
  style,
  ref,
  ...rest
}: InputProps) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);

  // The alert below the field is a separate element: put the error in the field's own hint too, so
  // a screen reader says it when the field takes focus.
  const fieldHint = error
    ? [accessibilityHint, error].filter(Boolean).join(" ")
    : accessibilityHint;
  const borderClass = error ? "border-danger" : focused ? "border-brand" : "border-border-default";

  return (
    <FieldFrame label={label} error={error} hint={hint} className={className}>
      <TextField
        ref={ref}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={fieldHint}
        editable={editable}
        multiline={multiline}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
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
        )}
        {...rest}
      />
    </FieldFrame>
  );
}
