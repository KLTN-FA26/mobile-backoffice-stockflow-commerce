import { useNetInfo } from "@react-native-community/netinfo";
import { WifiOff } from "lucide-react-native";
import { View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { useAnnounce } from "@/hooks/use-announce";
import { useThemeColors } from "@/hooks/use-theme-colors";

import { Text } from "@/components/ui";

const ICON_SIZE = 16;

/**
 * Shown while the device reports no connection. It reads NetInfo itself, so a screen only mounts it.
 * `isConnected` is null until NetInfo has made its first reading; that is not "offline".
 */
export function OfflineBanner() {
  const { isConnected } = useNetInfo();
  const colors = useThemeColors();
  const offline = isConnected === false;
  // Android reads the live region below by itself; iOS has none.
  useAnnounce(offline ? MOBILE_LABELS.offline : null);

  if (!offline) return null;

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2"
    >
      <WifiOff size={ICON_SIZE} color={colors["dot-warning"]} />
      <Text variant="meta" weight="medium" className="flex-1">
        {MOBILE_LABELS.offline}
      </Text>
    </View>
  );
}
