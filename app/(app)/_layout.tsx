import { Stack } from "expo-router";
import { useState } from "react";

import { ReloginSheet } from "@/components/mobile/ReloginSheet";
import { RouteErrorBoundary } from "@/components/mobile/RouteErrorBoundary";
import { SessionExpiryBanner } from "@/components/mobile/SessionExpiryBanner";

export { RouteErrorBoundary as ErrorBoundary };

/**
 * The signed-in area. A session running out shows a banner on top; an expired one (or the banner's
 * button) opens the re-login sheet over the open screen, which stays mounted underneath.
 */
export default function SignedInLayout() {
  const [reloginRequested, setReloginRequested] = useState(false);

  return (
    <ReloginSheet requested={reloginRequested} onRequestHandled={() => setReloginRequested(false)}>
      <SessionExpiryBanner onRelogin={() => setReloginRequested(true)}>
        <Stack screenOptions={{ headerShown: false }} />
      </SessionExpiryBanner>
    </ReloginSheet>
  );
}
