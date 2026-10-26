// Stand-in for `expo-camera` (registered in src/test/setup.ts). Drive it from a test:
// - `__setCameraPermission({ granted: false, canAskAgain: false })` sets the permission, as the
//   system and the hook both see it (`null`, the start value, means "not loaded yet");
// - `__setSystemCameraPermission({ granted: true })` changes it behind the app's back (the system
//   dialog's answer, or the Settings app): the hook only sees it once the app asks again, through
//   the request or the re-read (`__requestPermission`, `__getPermission`, both spies);
// - `__scanBarcode("A", "B")` plays the mounted `CameraView` reading those codes, one frame each,
//   before React re-renders (the native view can report several frames before the screen closes);
// - `__cameraViewProps()` returns the props the mounted `CameraView` got (barcode settings...).
import { act } from "@testing-library/react-native";
import { createElement, useEffect, useSyncExternalStore } from "react";
import { View, type ViewProps } from "react-native";

export type CameraPermission = {
  status: "granted" | "denied" | "undetermined";
  granted: boolean;
  canAskAgain: boolean;
  expires: "never";
};

type ScanResult = { type: string; data: string; cornerPoints: []; bounds: object };
type CameraViewProps = ViewProps & {
  onBarcodeScanned?: (result: ScanResult) => void;
  [prop: string]: unknown;
};

/** What the hook reports. */
let permission: CameraPermission | null = null;
/** What the system would answer if asked now. */
let system: CameraPermission | null = null;
const listeners = new Set<() => void>();
let mountedCamera: CameraViewProps | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function toPermission(next: Partial<CameraPermission> | null): CameraPermission | null {
  if (next === null) return null;
  const granted = next.granted ?? false;
  const canAskAgain = next.canAskAgain ?? !granted;
  return {
    granted,
    canAskAgain,
    status: next.status ?? (granted ? "granted" : canAskAgain ? "undetermined" : "denied"),
    expires: "never",
  };
}

/** Pass `null` to go back to "not loaded yet", which is what the real hook returns at first. */
export function __setCameraPermission(next: Partial<CameraPermission> | null): void {
  permission = toPermission(next);
  system = permission;
  listeners.forEach((listener) => listener());
}

/** The permission changes outside the app; the hook keeps its old value until it asks again. */
export function __setSystemCameraPermission(next: Partial<CameraPermission>): void {
  system = toPermission(next);
}

/** The hook asks the system (request or re-read) and reports the answer. */
async function ask(): Promise<CameraPermission | null> {
  if (system !== null) {
    permission = system;
    listeners.forEach((listener) => listener());
  }
  return permission;
}

export const __requestPermission = jest.fn(ask);
export const __getPermission = jest.fn(ask);

export function useCameraPermissions(): [
  CameraPermission | null,
  () => Promise<CameraPermission | null>,
  () => Promise<CameraPermission | null>,
] {
  const current = useSyncExternalStore(subscribe, () => permission);
  return [current, __requestPermission, __getPermission];
}

/** Props are forwarded so tests can read them; `__scanBarcode` calls its `onBarcodeScanned`. */
export function CameraView(props: CameraViewProps) {
  useEffect(() => {
    mountedCamera = props;
    return () => {
      if (mountedCamera === props) mountedCamera = null;
    };
  });
  return createElement(View, { ...props, testID: "camera-view" });
}

export function __cameraViewProps(): CameraViewProps | null {
  return mountedCamera;
}

/** Reads each code as one camera frame, all inside one `act` (no re-render in between). */
export async function __scanBarcode(...codes: string[]): Promise<void> {
  const camera = mountedCamera;
  if (camera === null) throw new Error("__scanBarcode: no CameraView is mounted");
  await act(async () => {
    for (const data of codes) {
      camera.onBarcodeScanned?.({ type: "qr", data, cornerPoints: [], bounds: {} });
    }
  });
}
