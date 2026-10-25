import { BottomSheetModal, BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { useContext, useEffect, useRef } from "react";
import { BackHandler, View, useWindowDimensions } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { UI_LIMITS } from "@/constants/mobile";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { RADIUS } from "@/lib/tokens";

import { DISMISSIBLE_BACKDROP, LOCKED_BACKDROP, renderHandle } from "./SheetParts";
import { Text } from "./Text";
import { SheetContextProvider } from "./sheet-context";

import type { ReactNode } from "react";

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  /** Fixed heights (`"50%"`, `320`). Leave out to size the sheet to its content. */
  snapPoints?: (string | number)[];
  /**
   * False while the sheet must stay (a request is running): a swipe down, a tap on the backdrop and
   * Android's Back button no longer close it. Closing through `open` still works. Default true.
   */
  dismissible?: boolean;
  /**
   * True for content that can outgrow the screen (a long list, a form): the title and the children
   * scroll together and the sheet grows with them up to 85% of the window. Default false.
   */
  scrollable?: boolean;
};

/**
 * The one overlay for choosing, filtering, confirming and entering a reason (N5): a modal bottom
 * sheet driven by `open`. Needs `BottomSheetModalProvider` and `GestureHandlerRootView` above it.
 * A swipe, a tap on the backdrop or the Back button closes it and reports `onOpenChange(false)`,
 * unless it is not `dismissible`. Text fields inside it (`Input`, `SearchField`, `QuantityStepper`)
 * switch to the keyboard-aware input by themselves (R30).
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  snapPoints,
  dismissible = true,
  scrollable = false,
}: SheetProps) {
  const colors = useThemeColors();
  const insets = useContext(SafeAreaInsetsContext);
  const { height: windowHeight } = useWindowDimensions();
  const modalRef = useRef<BottomSheetModal>(null);
  // True from present() until the sheet goes away, however that happens.
  const shownRef = useRef(false);

  useEffect(() => {
    if (open) {
      shownRef.current = true;
      modalRef.current?.present();
    } else if (shownRef.current) {
      // Never dismiss a sheet that was not presented: the library would stay stuck in "dismissing".
      shownRef.current = false;
      modalRef.current?.dismiss();
    }
  }, [open]);

  // The library has no Back button handling: while the sheet is open Back closes it, or does nothing
  // when it is locked, instead of leaving the screen underneath.
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (dismissible) modalRef.current?.dismiss();
      return true;
    });
    return () => subscription.remove();
  }, [open, dismissible]);

  // The library calls this for every way out. Only a user dismissal (swipe, backdrop) finds the
  // sheet still marked as shown; closing through `open` has already cleared the mark.
  const handleDismiss = () => {
    if (!shownRef.current) return;
    shownRef.current = false;
    onOpenChange(false);
  };

  const body = (
    <View className="gap-[12px] px-[16px] pb-[16px]">
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
  const bottomInset = { paddingBottom: insets?.bottom ?? 0 };

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enableDynamicSizing={snapPoints === undefined}
      maxDynamicContentSize={scrollable ? windowHeight * UI_LIMITS.sheetMaxHeightRatio : undefined}
      enablePanDownToClose={dismissible}
      backdropComponent={dismissible ? DISMISSIBLE_BACKDROP : LOCKED_BACKDROP}
      handleComponent={renderHandle}
      backgroundStyle={{ backgroundColor: colors["bg-surface"], borderRadius: RADIUS.md }}
      handleIndicatorStyle={{ backgroundColor: colors["border-strong"] }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      // The library groups the content into one adjustable element named "Bottom Sheet", which hides
      // the controls inside from VoiceOver. Leave the content ungrouped and name it by the title.
      accessible={false}
      accessibilityRole={null}
      accessibilityLabel={title}
      onDismiss={handleDismiss}
    >
      <SheetContextProvider value>
        {scrollable ? (
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={bottomInset}
          >
            {body}
          </BottomSheetScrollView>
        ) : (
          <BottomSheetView style={bottomInset}>{body}</BottomSheetView>
        )}
      </SheetContextProvider>
    </BottomSheetModal>
  );
}
