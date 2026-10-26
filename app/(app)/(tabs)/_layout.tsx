import { Tabs } from "expo-router";
import { CircleUserRound } from "lucide-react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { RouteErrorBoundary } from "@/components/mobile/RouteErrorBoundary";
import { NAV_GROUPS } from "@/components/mobile/nav-config";
import { tabIcon, useTabScreenOptions } from "@/components/mobile/tab-bar";
import { useNavVisibility } from "@/components/mobile/use-nav-visibility";

export { RouteErrorBoundary as ErrorBoundary };

/**
 * Nhập hàng · Kho · Thực hiện đơn · Tài khoản. Once the permissions are known, a work tab with no
 * item left is hidden (if it is open, the navigator moves to the first visible tab); while they
 * are pending or failed every tab stays. Tài khoản is always there.
 */
export default function TabsLayout() {
  const screenOptions = useTabScreenOptions();
  const { status, groups } = useNavVisibility();
  const shown = new Set(groups.map(({ group }) => group.key));

  return (
    <Tabs screenOptions={screenOptions}>
      {NAV_GROUPS.map((group) => (
        <Tabs.Screen
          key={group.key}
          name={group.key}
          options={{
            title: group.title,
            tabBarIcon: tabIcon(group.icon),
            href: status === "ready" && !shown.has(group.key) ? null : undefined,
          }}
        />
      ))}
      <Tabs.Screen
        name="account"
        options={{ title: MOBILE_LABELS.tabs.account, tabBarIcon: tabIcon(CircleUserRound) }}
      />
    </Tabs>
  );
}
