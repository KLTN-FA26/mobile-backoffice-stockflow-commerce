import { router } from "expo-router";
import { useEffect, useRef } from "react";

import { MOBILE_ROUTES, SCAN_MOBILE_LIMITS } from "@/constants/mobile";

import {
  createScanRequestId,
  publishScanFeedback,
  subscribeScan,
  subscribeScannerClosed,
} from "./scan-bus";

import type { ScanFeedback } from "./scan-bus";

export type ScanMode = "single" | "continuous";

type CameraSession = {
  requestId: string;
  mode: ScanMode;
  /** Its scanner screen is on its way or still open: until it reports its close. */
  scannerOpen: boolean;
  unsubscribe: () => void;
};

export type UseScanCameraOptions = {
  /** The camera screen's title. */
  title: string;
  mode: ScanMode;
  /** Each new object is passed on to an open continuous camera. */
  feedback: ScanFeedback | null;
  /** Every code the camera reads for this field, as it reads it. */
  onCode: (code: string) => void;
  /** The worker left the camera with "Nhập tay": the field should take the keyboard. */
  onTypeInstead?: () => void;
};

/**
 * The camera side of a scan field. The returned function opens the scanner route for a new request
 * id and subscribes to it. At most one subscription per field: opening again replaces it, unmount
 * drops it, and in single mode it ends with the first code. A continuous subscription lives until
 * the field reopens the camera or unmounts.
 *
 * While the scanner it opened has not reported its close (scan bus), the function does nothing: a
 * second tap before the modal covers the field would otherwise stack a second scanner. The close
 * signal comes from the scanner screen itself, so it covers every way out (button, code, back
 * gesture) without the field needing a navigator.
 */
export function useScanCamera({
  title,
  mode,
  feedback,
  onCode,
  onTypeInstead,
}: UseScanCameraOptions): () => void {
  const session = useRef<CameraSession | null>(null);
  // Codes arrive later: hand them to the callback of that moment, not of the opening.
  const latestOnCode = useRef(onCode);
  const latestOnTypeInstead = useRef(onTypeInstead);
  useEffect(() => {
    latestOnCode.current = onCode;
    latestOnTypeInstead.current = onTypeInstead;
  });

  // "Nhập tay" focuses the field once the camera screen has gone (see `typeInsteadFocusDelayMs`).
  const typeInsteadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      session.current?.unsubscribe();
      clearTimeout(typeInsteadTimer.current);
    },
    [],
  );

  useEffect(() => {
    const open = session.current;
    if (feedback !== null && open?.mode === "continuous") {
      publishScanFeedback(open.requestId, feedback);
    }
  }, [feedback]);

  return () => {
    if (session.current?.scannerOpen) return;
    session.current?.unsubscribe();
    const requestId = createScanRequestId();
    const stopCodes = subscribeScan(requestId, (code) => {
      if (mode === "single") stopCodes();
      latestOnCode.current(code);
    });
    const stopClosed = subscribeScannerClosed(requestId, (how) => {
      stopClosed();
      if (session.current?.requestId === requestId) session.current.scannerOpen = false;
      if (how !== "type-instead") return;
      clearTimeout(typeInsteadTimer.current);
      typeInsteadTimer.current = setTimeout(
        () => latestOnTypeInstead.current?.(),
        SCAN_MOBILE_LIMITS.typeInsteadFocusDelayMs,
      );
    });
    const unsubscribe = () => {
      stopCodes();
      stopClosed();
    };
    session.current = { requestId, mode, scannerOpen: true, unsubscribe };
    router.push({ pathname: MOBILE_ROUTES.scanner, params: { requestId, mode, title } });
  };
}
