import { Redirect, router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect } from "react";

import { MOBILE_LABELS, MOBILE_ROUTES } from "@/constants/mobile";

import { CameraScanner } from "@/components/mobile/scan/CameraScanner";

import type { ScanMode } from "@/components/mobile/scan/use-scan-camera";

type ScannerParams = { requestId?: string; mode?: string; title?: string };

function readMode(mode: string | undefined): ScanMode | null {
  if (mode === undefined) return "single";
  return mode === "single" || mode === "continuous" ? mode : null;
}

/**
 * The camera modal a `ScanField` opens: `/scanner?requestId=…&mode=single|continuous&title=…`.
 * Without a request id (or with an unknown mode) nobody waits for its codes: it closes at once,
 * never crashes. The screen's own navigation is used, not the imperative router: opened by a link
 * as the first screen, the router is not ready during the first render.
 */
export default function ScannerRoute() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<ScannerParams>();
  const requestId = typeof params.requestId === "string" ? params.requestId : "";
  const mode = readMode(typeof params.mode === "string" ? params.mode : undefined);
  const title = params.title || MOBILE_LABELS.scan.openCamera;
  const valid = requestId !== "" && mode !== null;
  const canGoBack = navigation.canGoBack();

  useEffect(() => {
    if (!valid && canGoBack) navigation.goBack();
  }, [valid, canGoBack, navigation]);

  if (!valid) return canGoBack ? null : <Redirect href={MOBILE_ROUTES.start} />;

  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace(MOBILE_ROUTES.start);
  };
  return <CameraScanner requestId={requestId} mode={mode} title={title} onClose={close} />;
}
