import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

import { makeQueryClient } from "@/lib/api/query-client";
import { wireReactQueryToNative } from "@/lib/platform/react-query-native";

import { ToastProvider } from "@/components/shared/ToastProvider";

import { ThemeProvider } from "./theme-provider";

import type { ReactNode } from "react";

const styles = StyleSheet.create({ root: { flex: 1 } });

/**
 * Everything the screens rely on, mounted once by the root layout. The order matters:
 * - `GestureHandlerRootView` first, or gestures (sheets, toasts, `StatusDot`) throw in dev;
 * - `BottomSheetModalProvider` inside `ThemeProvider`: sheets render in a portal at the end of this
 *   provider, and only there do they still get the theme's colour variables;
 * - the Toaster under the root view and the safe area, so it can be swiped and clears the notch,
 *   and after the sheet provider rather than inside it: it then mounts after the sheet portal host
 *   and draws above an open sheet (a failed sheet action reports through a toast).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  useEffect(() => wireReactQueryToNative(), []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
            <ToastProvider />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
