import { Redirect } from "expo-router";

import { IntlProbeScreen } from "@/components/mobile/IntlProbeScreen";

/** Dev-only route: `exp://<LAN-IP>:8081/--/dev-intl-probe`. Release builds bounce to the home screen. */
export default function DevIntlProbeRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <IntlProbeScreen />;
}
