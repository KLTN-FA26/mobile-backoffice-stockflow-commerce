import { useContext } from "react";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { useThemeColors } from "@/hooks/use-theme-colors";

import { Text } from "@/components/ui";

import type { LucideIcon } from "lucide-react-native";
import type { ColorValue } from "react-native";

/**
 * Above the bottom inset: icon (28) + a 12 px label line at the 1.3 font-scale cap (~21) + padding.
 * The library's default (49) is sized for a 10 px label, below the type scale's 12 px floor.
 */
const TAB_BAR_CONTENT_HEIGHT = 60;
const TAB_ICON_SIZE = 22;

type TabLabelProps = { focused: boolean; children: string };

/**
 * The tab name, through the app's `Text`: 12 px, capped at the 1.3 font-scale multiplier like
 * every other label (the library's own label scales without a cap on Android).
 */
function renderTabLabel({ focused, children }: TabLabelProps) {
  return (
    <Text
      variant="small"
      weight={focused ? "semibold" : "medium"}
      tone={focused ? "primary" : "secondary"}
      numberOfLines={1}
    >
      {children}
    </Text>
  );
}

/** A tab icon in the tint the tab bar passes (active / inactive). */
export function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon size={TAB_ICON_SIZE} color={typeof color === "string" ? color : undefined} />;
  };
}

/** Screen options shared by the four tabs: token colours, safe-area aware height, no header. */
export function useTabScreenOptions() {
  const colors = useThemeColors();
  const bottomInset = useContext(SafeAreaInsetsContext)?.bottom ?? 0;

  return {
    headerShown: false,
    tabBarActiveTintColor: colors["ink-primary"],
    tabBarInactiveTintColor: colors["ink-secondary"],
    tabBarLabel: renderTabLabel,
    // The bar pads itself by the bottom inset; the height has to include it.
    tabBarStyle: {
      height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
      backgroundColor: colors["bg-surface"],
      borderTopColor: colors["border-default"],
    },
    sceneStyle: { backgroundColor: colors["bg-base"] },
  };
}
