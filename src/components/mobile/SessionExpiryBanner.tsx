import { Clock } from "lucide-react-native";
import { useContext, useEffect, useEffectEvent } from "react";
import { AccessibilityInfo, View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { MOBILE_LABELS } from "@/constants/mobile";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { useSessionExpiry } from "@/lib/auth/use-session-expiry";

import { Button, Text } from "@/components/ui";

import type { ReactNode } from "react";

const MINUTE_MS = 60_000;
const ICON_SIZE = 16;

export type SessionExpiryBannerProps = {
  /** Opens the re-login sheet before the session runs out. */
  onRelogin: () => void;
  /** The screens under the banner. They stay mounted while it comes and goes. */
  children: ReactNode;
};

/**
 * "Session ending soon" above the signed-in screens (N8): shifts run longer than the 8-hour token,
 * which cannot be refreshed, so the worker gets the chance to sign in again before losing it.
 * The banner sits under the status bar and takes its inset, so the screens below do not pad for it
 * a second time. A screen reader announces it once, when it appears, not at every minute.
 *
 * The re-login sheet owns the clock-driven expiry; this banner runs its own `useSessionExpiry` for
 * display only. Two subscribers are harmless: both read the same `sessionExpiresAt`, and marking
 * an already expired session expired again changes nothing.
 */
export function SessionExpiryBanner({ onRelogin, children }: SessionExpiryBannerProps) {
  const colors = useThemeColors();
  const { warning, remainingMs } = useSessionExpiry();
  const insets = useContext(SafeAreaInsetsContext);
  // Whole minutes, rounded down (never promise more time than is left), and at least 1 while the
  // session still runs.
  const minutes =
    warning && remainingMs !== null ? Math.max(1, Math.floor(remainingMs / MINUTE_MS)) : null;
  const visible = minutes !== null;
  const screenInsets = visible && insets !== null ? { ...insets, top: 0 } : insets;

  const announce = useEffectEvent(() => {
    if (minutes !== null) {
      AccessibilityInfo.announceForAccessibility(MOBILE_LABELS.sessionExpiry.warning(minutes));
    }
  });
  useEffect(() => {
    if (visible) announce();
  }, [visible]);

  return (
    <View className="flex-1">
      {visible ? (
        <View
          style={{ paddingTop: insets?.top ?? 0 }}
          className="border-b border-warning/30 bg-warning/10"
        >
          <View className="flex-row items-center gap-[12px] px-[16px] py-[8px]">
            <Clock size={ICON_SIZE} color={colors.warning} />
            <Text variant="meta" className="flex-1">
              {MOBILE_LABELS.sessionExpiry.warning(minutes)}
            </Text>
            <Button
              size="sm"
              variant="secondary"
              label={MOBILE_LABELS.sessionExpiry.action}
              onPress={onRelogin}
            />
          </View>
        </View>
      ) : null}
      <SafeAreaInsetsContext.Provider value={screenInsets}>
        {children}
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}
