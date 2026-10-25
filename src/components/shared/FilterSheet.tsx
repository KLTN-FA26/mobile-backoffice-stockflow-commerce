import { View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { Button, Sheet } from "@/components/ui";

import type { ReactNode } from "react";

export type FilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** The filter fields (`Input`, `SelectSheet` triggers, `DateField`...). */
  children: ReactNode;
  /** Apply the chosen filters. The sheet closes itself afterwards. */
  onApply: () => void;
  onReset: () => void;
  /** False when no filter is set: "Đặt lại" is then dimmed and does nothing. */
  canReset: boolean;
};

/** All of a list's filters in one bottom sheet, with "Đặt lại" on the left and "Áp dụng" on the right. */
export function FilterSheet({
  open,
  onOpenChange,
  title,
  children,
  onApply,
  onReset,
  canReset,
}: FilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} scrollable>
      {children}
      <View className="flex-row gap-[12px]">
        <Button
          variant="secondary"
          label={MOBILE_LABELS.reset}
          disabled={!canReset}
          onPress={onReset}
          className="flex-1"
        />
        <Button
          label={MOBILE_LABELS.apply}
          onPress={() => {
            onApply();
            onOpenChange(false);
          }}
          className="flex-[2]"
        />
      </View>
    </Sheet>
  );
}
