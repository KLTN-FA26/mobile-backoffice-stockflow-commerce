import "../global.css";

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { MOBILE_ROUTES } from "@/constants/mobile";

import { APP_CONFIG } from "@/lib/config";
import { APP_FONTS } from "@/lib/fonts";
import { installCryptoPolyfill } from "@/lib/platform/polyfills";

import { AuthGate } from "@/components/mobile/AuthGate";
import { ConfigGate } from "@/components/mobile/ConfigErrorScreen";

import { AppProviders } from "@/providers/app-providers";

// Before anything renders: Hermes has no Web Crypto, and every request needs a correlation id.
installCryptoPolyfill();
void SplashScreen.preventAutoHideAsync();

/**
 * Providers, then the config and session gates, then the routes each session state may open
 * (Expo Router's protected routes). `index` and `dev-intl-probe` sit outside both guards.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(APP_FONTS);
  const fontsSettled = fontsLoaded || fontError !== null;

  useEffect(() => {
    // The app carries on with the system fonts; say so in development.
    if (fontError !== null && __DEV__) console.warn("Could not load the app fonts", fontError);
    if (fontsSettled) void SplashScreen.hideAsync();
  }, [fontsSettled, fontError]);

  if (!fontsSettled) return null;
  return (
    <AppProviders>
      <ConfigGate config={APP_CONFIG}>
        <AuthGate>
          {(status) => (
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={status === "authenticated"} redirectTo={MOBILE_ROUTES.login}>
                <Stack.Screen name="(app)" />
              </Stack.Protected>
              <Stack.Protected guard={status === "unauthenticated"}>
                <Stack.Screen name="login" />
              </Stack.Protected>
            </Stack>
          )}
        </AuthGate>
      </ConfigGate>
    </AppProviders>
  );
}
