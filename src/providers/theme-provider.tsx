import { StatusBar } from "expo-status-bar";
import { vars } from "nativewind";
import { useEffect } from "react";
import { Appearance, StyleSheet, View, useColorScheme } from "react-native";

import { useAppStore } from "@/lib/store/use-app-store";
import { themeChannels } from "@/lib/tokens";

import type { Scheme } from "@/lib/tokens";
import type { ReactNode } from "react";

const styles = StyleSheet.create({ root: { flex: 1 } });

// Built once: `vars()` returns an opaque style object that NativeWind resolves into variables for
// every descendant, so the same `bg-bg-base` class is right in light and dark.
const THEME_VARS: Record<Scheme, ReturnType<typeof vars>> = {
  light: vars(themeChannels.light),
  dark: vars(themeChannels.dark),
};

/**
 * The scheme in effect: the user's choice, or the system's when the choice is "system". An explicit
 * choice is used straight away rather than waiting for the native appearance to echo it back.
 */
export function useResolvedScheme(): Scheme {
  const theme = useAppStore((state) => state.theme);
  const system = useColorScheme();
  if (theme === "system") return system === "dark" ? "dark" : "light";
  return theme;
}

/** Applies the token variables of the resolved scheme to the whole tree. Mount it once, at the root. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useAppStore((state) => state.theme);
  const scheme = useResolvedScheme();

  // Native pickers, alerts and the keyboard follow the same appearance as the app.
  useEffect(() => {
    Appearance.setColorScheme(theme === "system" ? "unspecified" : theme);
  }, [theme]);

  return (
    <View style={[styles.root, THEME_VARS[scheme]]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {children}
    </View>
  );
}
