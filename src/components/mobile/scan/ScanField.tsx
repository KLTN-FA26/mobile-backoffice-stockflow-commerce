import { ScanLine, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { CONTROL_HEIGHT } from "@/lib/tokens";
import { cn } from "@/lib/utils";

import { FieldFrame, IconButton, TextField } from "@/components/ui";

import { ScanCameraButton } from "./ScanCameraButton";
import { ScanFeedbackBanner } from "./ScanFeedbackBanner";
import { useScanCamera } from "./use-scan-camera";
import { useScanInput } from "./use-scan-input";
import { useWarnInSheet } from "./use-warn-in-sheet";

import type { ScanFeedback } from "./scan-bus";
import type { ScanMode } from "./use-scan-camera";

export type { ScanMode } from "./use-scan-camera";

export type ScanFieldProps = {
  /** Above the field, its accessibility label and the camera screen's title. */
  label: string;
  placeholder: string;
  /** A trimmed, normalized, non-empty code, typed or read by the camera. */
  onSubmit: (code: string) => void;
  /** Applied after `trim()`, e.g. upper-case. */
  normalize?: (code: string) => string;
  /** `single` (default): one code, then the camera closes; `continuous`: stays open (stations). */
  cameraMode?: ScanMode;
  /** Locks the field: no typing, Enter or camera, and codes from a camera still open are dropped. */
  disabled?: boolean;
  /**
   * The previous code is still being handled: a spinner only. Enter and the camera keep working, as
   * on the web: a scanner keeps sending codes, and the station queues and dedupes them.
   */
  pending?: boolean;
  /** The longest code the field takes (web `maxLength`). */
  maxLength?: number;
  /** Under the field while there is no scan result: the result takes its place, as on the web. */
  hint?: string;
  /** Shown under the field and, while a continuous camera is open, over the camera. */
  feedback?: ScanFeedback | null;
  autoFocus?: boolean;
};

const FIELD_HEIGHT = CONTROL_HEIGHT.lg;
const ICON_SIZE = 20;
const FEEDBACK_BORDER = { positive: "border-positive", danger: "border-danger" } as const;
const { scan } = MOBILE_LABELS;

/** Where every code is entered (location, SKU, package, LPN…): typed with Enter, or by camera. */
export function ScanField({
  label,
  placeholder,
  onSubmit,
  normalize,
  cameraMode = "single",
  disabled = false,
  pending = false,
  maxLength,
  hint,
  feedback = null,
  autoFocus = false,
}: ScanFieldProps) {
  const colors = useThemeColors();
  const [focused, setFocused] = useState(false);
  useWarnInSheet();

  // Typed and camera codes alike: trim, normalize, skip empty.
  const deliver = (raw: string): boolean => {
    const code = normalize ? normalize(raw.trim()) : raw.trim();
    if (code !== "") onSubmit(code);
    return code !== "";
  };

  const { inputRef, value, onChangeText, submit, clear } = useScanInput({ deliver, disabled });
  // A disabled field takes no code at all, not even from a camera that is still open.
  const onCode = (code: string) => {
    if (!disabled) deliver(code);
  };
  const openCamera = useScanCamera({ title: label, mode: cameraMode, feedback, onCode });

  const idleBorder = focused ? "border-brand" : "border-border-default";
  const border = feedback ? FEEDBACK_BORDER[feedback.tone] : idleBorder;

  return (
    <FieldFrame label={label} hint={feedback ? undefined : hint}>
      <View className="flex-row gap-[8px]">
        <View
          style={{ height: FIELD_HEIGHT }}
          className={cn(
            "min-w-0 flex-1 flex-row items-center rounded-md border bg-bg-surface pl-[12px]",
            border,
            disabled && "opacity-50",
          )}
        >
          <ScanLine size={ICON_SIZE} color={colors.accent} />
          <TextField
            ref={inputRef}
            accessibilityLabel={label}
            accessibilityHint={scan.typeHint}
            accessibilityState={{ disabled, busy: pending }}
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={submit}
            maxLength={maxLength}
            // Enter keeps the keyboard and the focus: the next code follows straight away.
            submitBehavior="submit"
            returnKeyType="done"
            placeholder={placeholder}
            placeholderTextColor={colors["ink-tertiary"]}
            editable={!disabled}
            autoFocus={autoFocus}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="h-full min-w-0 flex-1 px-[8px] font-mono text-[15px] text-ink-primary"
          />
          {pending ? (
            <ActivityIndicator
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={MOBILE_LABELS.processing}
              color={colors["ink-tertiary"]}
            />
          ) : null}
          {value.length > 0 && !disabled ? (
            <IconButton
              icon={X}
              accessibilityLabel={scan.clear}
              onPress={clear}
              iconColor="ink-secondary"
            />
          ) : null}
        </View>
        <ScanCameraButton onPress={openCamera} disabled={disabled} />
      </View>
      {feedback ? <ScanFeedbackBanner feedback={feedback} /> : null}
    </FieldFrame>
  );
}
