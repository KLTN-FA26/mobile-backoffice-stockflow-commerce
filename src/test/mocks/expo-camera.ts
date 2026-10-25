// Stand-in for `expo-camera` (registered in src/test/setup.ts). Drive the permission from a test
// with `__setCameraPermission({ granted: false, canAskAgain: false })`.
import { createElement, useSyncExternalStore } from "react";
import { View, type ViewProps } from "react-native";

export type CameraPermission = {
  status: "granted" | "denied" | "undetermined";
  granted: boolean;
  canAskAgain: boolean;
  expires: "never";
};

let permission: CameraPermission | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Pass `null` to go back to "not loaded yet", which is what the real hook returns at first. */
export function __setCameraPermission(next: Partial<CameraPermission> | null): void {
  if (next === null) {
    permission = null;
  } else {
    const granted = next.granted ?? false;
    const canAskAgain = next.canAskAgain ?? !granted;
    permission = {
      granted,
      canAskAgain,
      status: next.status ?? (granted ? "granted" : canAskAgain ? "undetermined" : "denied"),
      expires: "never",
    };
  }
  listeners.forEach((listener) => listener());
}

/** Spy on the request; call `__setCameraPermission` inside `mockImplementation` to simulate a grant. */
export const __requestPermission = jest.fn(async () => permission);

export function useCameraPermissions(): [
  CameraPermission | null,
  () => Promise<CameraPermission | null>,
] {
  const current = useSyncExternalStore(subscribe, () => permission);
  return [current, __requestPermission];
}

/** Props are forwarded so tests can `fireEvent(getByTestId("camera-view"), "barcodeScanned", ...)`. */
export function CameraView(props: ViewProps & Record<string, unknown>) {
  return createElement(View, { ...props, testID: "camera-view" });
}
