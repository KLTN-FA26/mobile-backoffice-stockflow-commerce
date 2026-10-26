import { ServerCog } from "lucide-react-native";
import { View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { StateLayout } from "@/components/shared/StateLayout";

import type { AppConfig } from "@/lib/config";
import type { ReactNode } from "react";

/** What the app shows instead of itself when `EXPO_PUBLIC_API_URL` is missing or not an http(s) URL. */
export function ConfigErrorScreen() {
  return (
    <View className="flex-1 bg-bg-base">
      <StateLayout
        icon={ServerCog}
        title={MOBILE_LABELS.config.title}
        description={MOBILE_LABELS.config.description}
      />
    </View>
  );
}

export type ConfigGateProps = { config: AppConfig; children: ReactNode };

/**
 * Renders the app only with a usable API base URL. Without one no request could reach the backend,
 * so nothing behind the gate (session bootstrap included) may start.
 */
export function ConfigGate({ config, children }: ConfigGateProps) {
  return config.ok ? children : <ConfigErrorScreen />;
}
