import { BottomSheetBackdrop, BottomSheetHandle } from "@gorhom/bottom-sheet";

import { SHEET_LABELS } from "@/constants/mobile";

import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import type { ComponentProps } from "react";

// The library reads these out in English by default ("Bottom sheet backdrop", "Bottom sheet handle"
// and their hints), so the backdrop and the handle always get the Vietnamese ones.
function makeBackdrop(pressBehavior: "close" | "none") {
  return function renderBackdrop(props: BottomSheetBackdropProps) {
    return (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={pressBehavior}
        accessibilityLabel={SHEET_LABELS.backdropLabel}
        accessibilityHint={SHEET_LABELS.backdropHint}
      />
    );
  };
}

export const DISMISSIBLE_BACKDROP = makeBackdrop("close");
export const LOCKED_BACKDROP = makeBackdrop("none");

export function renderHandle(props: ComponentProps<typeof BottomSheetHandle>) {
  return (
    <BottomSheetHandle
      {...props}
      accessibilityLabel={SHEET_LABELS.handleLabel}
      accessibilityHint={SHEET_LABELS.handleHint}
    />
  );
}
