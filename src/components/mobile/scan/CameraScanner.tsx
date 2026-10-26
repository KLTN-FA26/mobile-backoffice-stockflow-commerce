import { useCameraPermissions } from "expo-camera";
import { X } from "lucide-react-native";
import { useContext, useEffect } from "react";
import { AppState, View } from "react-native";
import { SafeAreaInsetsContext, SafeAreaView } from "react-native-safe-area-context";

import { MOBILE_LABELS } from "@/constants/mobile";

import { IconButton } from "@/components/ui";

import { ScreenHeader } from "../ScreenHeader";

import { CameraPermissionPrompt } from "./CameraPermissionPrompt";
import { LiveCamera } from "./LiveCamera";
import { publishScannerClosed } from "./scan-bus";

import type { ScanMode } from "./use-scan-camera";

export type CameraScannerProps = {
  /** The opening this screen answers to (scan bus). */
  requestId: string;
  mode: ScanMode;
  title: string;
  onClose: () => void;
};

/**
 * expo's permission hook reads the permission on mount only. While it is not granted, read it again
 * each time the app comes back to the foreground: the worker may have allowed the camera in
 * Settings meanwhile, and the denied screen must not stay up.
 */
function useCameraPermission() {
  const [permission, request, reread] = useCameraPermissions();
  const granted = permission?.granted === true;

  useEffect(() => {
    if (granted) return undefined;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      reread().catch((error: unknown) => {
        if (__DEV__) console.warn("Could not read the camera permission", error);
      });
    });
    return () => subscription.remove();
  }, [granted, reread]);

  return [permission, request] as const;
}

/**
 * The full-screen camera of the scanner route. It reads codes for the field that opened it (by
 * `requestId` on the scan bus): `single` closes on the first code, `continuous` stays open, drops
 * repeats within `dedupeWindowMs` and shows the station's feedback over the picture. Without camera
 * access it asks for it or points to Settings; the close button is always there.
 */
export function CameraScanner({ requestId, mode, title, onClose }: CameraScannerProps) {
  const insets = useContext(SafeAreaInsetsContext);
  const [permission, requestPermission] = useCameraPermission();
  // However the screen goes (close button, a code in single mode, back gesture), the field that
  // opened it may open the camera again.
  useEffect(() => () => publishScannerClosed(requestId), [requestId]);

  const closeButton = (
    // The negative margin lines the icon up with the screen edge.
    <IconButton
      icon={X}
      accessibilityLabel={MOBILE_LABELS.scan.close}
      onPress={onClose}
      className="-mr-[12px]"
    />
  );

  return (
    // The modal covers the whole window, the session banner included, but the banner hands the
    // screens under it a top inset of 0: measure the top edge natively here, and let the header
    // add nothing more.
    <SafeAreaView edges={["top"]} className="flex-1 bg-bg-surface">
      <SafeAreaInsetsContext.Provider value={insets && { ...insets, top: 0 }}>
        <View className="flex-1 bg-bg-base">
          <ScreenHeader title={title} right={closeButton} />
          {/* `null` while the permission loads: a neutral screen, no flash of the prompt. */}
          {permission === null ? null : permission.granted ? (
            <LiveCamera requestId={requestId} mode={mode} onClose={onClose} />
          ) : (
            <CameraPermissionPrompt
              canAskAgain={permission.canAskAgain}
              onRequest={requestPermission}
              onTypeInstead={onClose}
            />
          )}
        </View>
      </SafeAreaInsetsContext.Provider>
    </SafeAreaView>
  );
}
