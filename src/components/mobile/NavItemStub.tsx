import { router, useCanGoBack } from "expo-router";
import { View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { ComingSoon } from "@/components/shared/ComingSoon";

import { ScreenHeader } from "./ScreenHeader";
import { findNavItem } from "./nav-config";

export type NavItemStubProps = {
  /** The route of a hub item (`MOBILE_ROUTES.*`). */
  href: string;
};

/**
 * The screen behind a hub item until its module is ported: the item's own name, and either the
 * web's "in development" line (D2) or "being moved to the app". Later tasks swap the route file
 * for the real screen.
 */
export function NavItemStub({ href }: NavItemStubProps) {
  // Reactive: on a pushed screen's first render, `router.canGoBack()` does not know the push yet.
  const canGoBack = useCanGoBack();
  const item = findNavItem(href);
  // A route file pointing at a path no hub item has is a programming error: the route error
  // boundary shows it instead of a screen without a name.
  if (item === undefined) throw new Error(`No hub item for ${href}`);

  return (
    <View className="flex-1 bg-bg-base">
      <ScreenHeader title={item.label} onBack={canGoBack ? () => router.back() : undefined} />
      <ComingSoon
        title={item.label}
        icon={item.icon}
        description={
          item.comingSoon
            ? MOBILE_LABELS.comingSoonDescription
            : MOBILE_LABELS.portPendingDescription
        }
      />
    </View>
  );
}
