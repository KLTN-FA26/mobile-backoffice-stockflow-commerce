import { Stack } from "expo-router";

import { RouteErrorBoundary } from "@/components/mobile/RouteErrorBoundary";

export { RouteErrorBoundary as ErrorBoundary };

/** The fulfillment tab's own stack: the tab bar stays visible over its hub and lists. */
export default function FulfillmentTabLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
