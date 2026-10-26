import { BottomSheetBackdrop, BottomSheetHandle } from "@gorhom/bottom-sheet";
import { useEffect, useEffectEvent } from "react";
import { BackHandler, StyleSheet, View } from "react-native";

import { SHEET_LABELS } from "@/constants/mobile";

import type { BottomSheetBackdropProps, BottomSheetBackgroundProps } from "@gorhom/bottom-sheet";
import type { ComponentProps, ReactNode } from "react";

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

/**
 * The library has no Back button handling: while the sheet is open Back closes it (`dismiss`), or
 * does nothing when it is not dismissible, instead of leaving the screen underneath.
 */
export function useBackButton(open: boolean, dismissible: boolean, dismiss: () => void): void {
  const onBack = useEffectEvent(() => {
    if (dismissible) dismiss();
  });
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [open]);
}

export function renderHandle(props: ComponentProps<typeof BottomSheetHandle>) {
  return (
    <BottomSheetHandle
      {...props}
      accessibilityLabel={SHEET_LABELS.handleLabel}
      accessibilityHint={SHEET_LABELS.handleHint}
    />
  );
}

export const SHEET_BACKGROUND_TEST_ID = "sheet-background";

// The library's default background is one more adjustable element read as "Bottom Sheet" in
// English, in a hard-coded white. This one is the surface token (right in both themes, no hex),
// fills the place the library gives it (`style`) and is hidden from screen readers; the sheet's
// content is named by its title instead.
export function renderBackground({ pointerEvents, style }: BottomSheetBackgroundProps) {
  return (
    <View
      testID={SHEET_BACKGROUND_TEST_ID}
      pointerEvents={pointerEvents}
      style={style}
      className="rounded-md bg-bg-surface"
      accessible={false}
      importantForAccessibility="no"
    />
  );
}

/**
 * Wraps the whole sheet, backdrop included: the view the library mounts next to the screens, at the
 * end of `BottomSheetModalProvider`. iOS VoiceOver skips the siblings of a view marked
 * `accessibilityViewIsModal`, so here that is the screen behind the sheet; set on the content inside
 * the sheet it would only hide the handle and the background. It fills the window like the provider
 * it sits in and lets touches through where the sheet draws nothing. `collapsable={false}` keeps it
 * from being flattened away on Android's new architecture.
 */
export function SheetContainer({ children }: { children?: ReactNode }) {
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      collapsable={false}
      accessibilityViewIsModal
    >
      {children}
    </View>
  );
}
