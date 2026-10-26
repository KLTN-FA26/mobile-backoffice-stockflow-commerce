import createJiti from "jiti";

import type * as Tokens from "./src/lib/tokens";
import type { ExpoConfig } from "expo/config";

// Expo evaluates this file in plain Node, and its `require` cannot load a .ts file (nor resolve the
// `@/` alias), so a plain import of src/lib/tokens.ts fails. Tailwind has the same problem with
// tailwind.config.js and falls back to its own copy of jiti; this does the same up front, with jiti
// declared as a devDependency (the 1.x line tailwindcss uses). tokens.ts only imports types, so the
// jiti require needs nothing else.
const jiti = createJiti(__filename, { cache: false });
const { COLOR_TOKENS }: typeof Tokens = jiti("./src/lib/tokens");

const APP_ID = "vn.stockflow.backoffice";

type Plugins = NonNullable<ExpoConfig["plugins"]>;
type Env = Readonly<Record<string, string | undefined>>;

/**
 * Plain HTTP to the dev BE (`http://10.0.2.2:8080/api/v1`) is blocked by Android 9+ unless the app
 * allows cleartext traffic. Only the development build gets that: EAS sets `EAS_BUILD_PROFILE` while
 * it builds, so preview and production builds (and `expo export`) never allow it. R7.
 */
function cleartextPlugins(env: Env): Plugins {
  if (env.EAS_BUILD_PROFILE !== "development") return [];
  return [["expo-build-properties", { android: { usesCleartextTraffic: true } }]];
}

/** `env` is a parameter so a unit test can load the config as each EAS profile would. */
export function createConfig(env: Env): ExpoConfig {
  return {
    name: "StockFlow Backoffice",
    slug: "stockflow-backoffice",
    version: "0.1.0",
    scheme: "stockflow",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: APP_ID,
      // Phone-first app (spec D1): no iPad layout.
      supportsTablet: false,
    },
    android: {
      package: APP_ID,
      adaptiveIcon: {
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      "expo-router",
      [
        "expo-camera",
        {
          cameraPermission: "StockFlow cần camera để quét mã vạch và mã QR.",
          // The camera only reads barcodes: no video recording, so no microphone permission.
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      // expo-secure-store (login token) and expo-sqlite (kv-store) need no options here: the
      // defaults keep Android auto-backup from restoring a token that no other device can decrypt,
      // and no SQLite build flags (FTS, SQLCipher, vec) are used.
      "expo-secure-store",
      "expo-sqlite",
      [
        "expo-splash-screen",
        {
          image: "./assets/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: COLOR_TOKENS.light["bg-base"],
          dark: { backgroundColor: COLOR_TOKENS.dark["bg-base"] },
        },
      ],
      ...cleartextPlugins(env),
    ],
  };
}

export default createConfig(process.env);
