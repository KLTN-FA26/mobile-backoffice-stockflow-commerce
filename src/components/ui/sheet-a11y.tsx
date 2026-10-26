import { useEffect, useRef, useSyncExternalStore } from "react";
import { AccessibilityInfo, Platform, StyleSheet, View } from "react-native";

import { MOTION_MS } from "@/lib/tokens";

import { Text } from "./Text";

import type { ReactNode } from "react";
import type { HostInstance } from "react-native";

/*
 * Screen readers and an open sheet. The sheet draws in the provider's portal, next to the screens,
 * so nothing stops a screen reader from walking the screen behind it. iOS VoiceOver respects the
 * sheet's `accessibilityViewIsModal`; Android TalkBack has no such flag. So every open sheet is
 * counted here, and `ScreenBehindSheets` (mounted once by `AppProviders`, around the screens) hides
 * the screens from both readers while any sheet is open.
 */

let openSheets = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function anySheetOpen(): boolean {
  return openSheets > 0;
}

/** Counts this sheet as open while `open` is true. */
export function useReportSheetOpen(open: boolean): void {
  useEffect(() => {
    if (!open) return;
    openSheets += 1;
    emit();
    return () => {
      openSheets -= 1;
      emit();
    };
  }, [open]);
}

export const SCREEN_BEHIND_SHEETS_TEST_ID = "screen-behind-sheets";

const styles = StyleSheet.create({ fill: { flex: 1 } });

/** The screens. While any sheet is open they are hidden from TalkBack and VoiceOver. */
export function ScreenBehindSheets({ children }: { children: ReactNode }) {
  const hidden = useSyncExternalStore(subscribe, anySheetOpen, anySheetOpen);
  return (
    <View
      testID={SCREEN_BEHIND_SHEETS_TEST_ID}
      style={styles.fill}
      collapsable={false}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      accessibilityElementsHidden={hidden}
    >
      {children}
    </View>
  );
}

/**
 * The sheet's title. On Android it takes TalkBack's focus once the sheet has slid in, so the reader
 * starts inside the sheet and reads the title (iOS gets an announcement from the sheet instead).
 */
export function SheetTitle({ title }: { title: string }) {
  const ref = useRef<HostInstance>(null);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const timer = setTimeout(() => {
      if (ref.current) AccessibilityInfo.sendAccessibilityEvent(ref.current, "focus");
    }, MOTION_MS.standard);
    return () => clearTimeout(timer);
  }, []);

  // The reader's focus target is this view, read as one header; its name is the title text (no
  // label of its own: the sheet's content already carries the title as its label).
  return (
    <View ref={ref} accessible accessibilityRole="header">
      <Text variant="title">{title}</Text>
    </View>
  );
}
