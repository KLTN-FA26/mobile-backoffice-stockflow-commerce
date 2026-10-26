import type { ExpoConfig } from "expo/config";

const APP_ID = "vn.stockflow.backoffice";

const config: ExpoConfig = {
  name: "StockFlow Backoffice",
  slug: "stockflow-backoffice",
  version: "0.1.0",
  scheme: "stockflow",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: APP_ID,
    supportsTablet: true,
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
  ],
};

export default config;
