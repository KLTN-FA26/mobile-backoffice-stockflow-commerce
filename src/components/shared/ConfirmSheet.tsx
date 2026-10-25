import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { Button, Sheet, Text, Textarea } from "@/components/ui";

import { SlotText } from "./SlotText";

import type { ReactNode } from "react";

export type ConfirmSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Adds a reason field; confirming stays locked until it holds something other than spaces. */
  requireReason?: boolean;
  reasonLabel?: string;
  /** Caps the reason and shows a counter. */
  reasonMaxLength?: number;
  /** Called with the trimmed reason when `requireReason`, else with nothing. */
  onConfirm: (reason?: string) => void;
  /** `"danger"` (the default, as on the web) for destructive actions. */
  variant?: "danger" | "default";
  loading?: boolean;
  /**
   * True (the default): confirming closes the sheet and clears the reason. False, for an action that
   * calls the API: the sheet stays, reason included, until the caller closes it on success; on
   * failure the user fixes it and tries again without typing the reason twice.
   */
  closeOnConfirm?: boolean;
  /** What went wrong with the last confirm, shown inside the sheet where a screen reader finds it. */
  error?: ReactNode;
  /** Extra content under the description, before the reason field. */
  children?: ReactNode;
};

/** The confirmation of an action, with an optional reason: a bottom sheet in place of the web's dialog. */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = MOBILE_LABELS.confirm,
  cancelLabel = MOBILE_LABELS.cancel,
  requireReason = false,
  reasonLabel = MOBILE_LABELS.reasonLabel,
  reasonMaxLength,
  onConfirm,
  variant = "danger",
  loading = false,
  closeOnConfirm = true,
  error,
  children,
}: ConfirmSheetProps) {
  const [reason, setReason] = useState("");
  // The caller may close the sheet through `open` alone: the reason goes with it. Adjusted while
  // rendering, as React advises for state that follows a prop.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setReason("");
  }

  // Set the moment a confirm closes the sheet: a second tap during the closing animation must not
  // confirm again. Cleared when the sheet opens. Not used with `closeOnConfirm={false}`, where the
  // sheet stays open and the caller's `loading` guards the request.
  const confirmed = useRef(false);
  useEffect(() => {
    if (open) confirmed.current = false;
  }, [open]);

  const trimmed = reason.trim();
  const canConfirm = (!requireReason || trimmed.length > 0) && !loading;

  const handleOpenChange = (next: boolean) => {
    if (!next) setReason("");
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (!canConfirm || confirmed.current) return;
    if (closeOnConfirm) confirmed.current = true;
    onConfirm(requireReason ? trimmed : undefined);
    if (closeOnConfirm) handleOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      scrollable
      // A running request cannot be swiped away: its outcome would have nowhere to show.
      dismissible={!loading}
    >
      <Text tone="secondary">{description}</Text>
      {children}
      {requireReason ? (
        <Textarea
          label={`${reasonLabel} *`}
          accessibilityLabel={reasonLabel}
          placeholder={MOBILE_LABELS.reasonPlaceholder}
          value={reason}
          onChangeText={setReason}
          maxLength={reasonMaxLength}
          hint={reasonMaxLength === undefined ? undefined : `${reason.length}/${reasonMaxLength}`}
        />
      ) : null}
      {error ? (
        <View accessible accessibilityRole="alert" accessibilityLiveRegion="polite">
          <SlotText variant="meta" tone="danger">
            {error}
          </SlotText>
        </View>
      ) : null}
      <View className="flex-row gap-[12px]">
        <Button
          variant="secondary"
          label={cancelLabel}
          disabled={loading}
          onPress={() => handleOpenChange(false)}
          className="flex-1"
        />
        <Button
          variant={variant === "danger" ? "danger" : "primary"}
          label={loading ? MOBILE_LABELS.processing : confirmLabel}
          loading={loading}
          disabled={!canConfirm}
          onPress={handleConfirm}
          className="flex-1"
        />
      </View>
    </Sheet>
  );
}
