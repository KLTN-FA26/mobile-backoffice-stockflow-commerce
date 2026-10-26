import { CameraView } from "expo-camera";
import { useContext, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { useTransientFeedback } from "@/hooks/use-transient-feedback";

import { ScanFeedbackBanner } from "./ScanFeedbackBanner";
import { createScanDeduper } from "./dedupe";
import { publishScan, subscribeScanFeedback } from "./scan-bus";

import type { ScanFeedback } from "./scan-bus";
import type { ScanMode } from "./use-scan-camera";
import type { BarcodeScanningResult, BarcodeType } from "expo-camera";

export type LiveCameraProps = { requestId: string; mode: ScanMode; onClose: () => void };

/** Code128, Code39, EAN-13/8, UPC-A/E, QR and DataMatrix: what warehouse labels carry. */
const BARCODE_TYPES: BarcodeType[] = [
  "code128",
  "code39",
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "qr",
  "datamatrix",
];
const SCAN_SETTINGS = { barcodeTypes: BARCODE_TYPES };
const OVERLAY_GAP = 16;

/**
 * The station's feedback over a continuous camera, with the station's timing (right fades, wrong
 * stays). The station already played the tone and the vibration when it showed the result.
 */
function useStationFeedback(requestId: string, enabled: boolean): ScanFeedback | null {
  const { feedback, show } = useTransientFeedback();

  useEffect(
    () => (enabled ? subscribeScanFeedback(requestId, show) : undefined),
    [requestId, enabled, show],
  );

  return feedback;
}

/**
 * The camera picture and what it reads. `single`: the first code goes to the scan bus and the
 * screen closes. `continuous`: every code the deduper lets through goes to the scan bus, the screen
 * stays, and the station's feedback shows over the picture.
 */
export function LiveCamera({ requestId, mode, onClose }: LiveCameraProps) {
  const insets = useContext(SafeAreaInsetsContext);
  const [accept] = useState(() => createScanDeduper());
  // The camera reports frame after frame until the screen is gone: single mode takes the first.
  const delivered = useRef(false);
  const feedback = useStationFeedback(requestId, mode === "continuous");

  const onBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    const code = data.trim();
    if (code === "") return;
    if (mode === "continuous") {
      if (accept(code)) publishScan(requestId, code);
      return;
    }
    if (delivered.current) return;
    delivered.current = true;
    publishScan(requestId, code);
    onClose();
  };

  return (
    <View className="flex-1">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={SCAN_SETTINGS}
        onBarcodeScanned={onBarcodeScanned}
      />
      {feedback ? (
        <View
          className="absolute inset-x-[16px]"
          style={{ bottom: OVERLAY_GAP + (insets?.bottom ?? 0) }}
        >
          <ScanFeedbackBanner feedback={feedback} />
        </View>
      ) : null}
    </View>
  );
}
