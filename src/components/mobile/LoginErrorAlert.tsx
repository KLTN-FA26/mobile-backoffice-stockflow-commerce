import { View } from "react-native";

import { useAnnounce } from "@/hooks/use-announce";

import { Text } from "@/components/ui";

/**
 * Why the last sign-in failed, in the web login page's box (danger tint, danger text). Spoken when
 * it appears on iOS too, which has no live regions.
 */
export function LoginErrorAlert({ message }: { message: string }) {
  useAnnounce(message);

  return (
    <View className="rounded-md border border-danger/30 bg-danger/10 px-[12px] py-[8px]">
      <Text accessibilityRole="alert" accessibilityLiveRegion="polite" variant="meta" tone="danger">
        {message}
      </Text>
    </View>
  );
}
