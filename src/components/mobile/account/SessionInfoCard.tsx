import Constants from "expo-constants";
import { View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { useSessionExpiry } from "@/lib/auth/use-session-expiry";

import { InfoRow } from "@/components/shared";
import { Separator, Text } from "@/components/ui";

import { AccountCard } from "./AccountCard";

const { account } = MOBILE_LABELS;

const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;

/** The app version, or a dash when the build does not report one. */
function appVersion(): string {
  const version = Constants.expoConfig?.version;
  return version === undefined || version === "" ? account.versionUnknown : version;
}

/**
 * How long the sign-in lasts and which build this is. The remaining time is shown in whole minutes,
 * rounded down (never more than is left); it stays hidden while no expiry is known. Reading the
 * clock here is for display only: the re-login sheet owns what happens when it runs out.
 */
export function SessionInfoCard() {
  const { remainingMs } = useSessionExpiry();
  const minutesLeft =
    remainingMs === null ? null : Math.floor(Math.max(0, remainingMs) / MINUTE_MS);

  return (
    <AccountCard>
      {minutesLeft === null ? null : (
        <>
          <View className="min-h-[44px] justify-center py-[8px]">
            <Text variant="meta" tone="secondary">
              {account.sessionRemaining(
                Math.floor(minutesLeft / MINUTES_PER_HOUR),
                minutesLeft % MINUTES_PER_HOUR,
              )}
            </Text>
          </View>
          <Separator />
        </>
      )}
      <InfoRow label={account.version} value={appVersion()} mono />
    </AccountCard>
  );
}
