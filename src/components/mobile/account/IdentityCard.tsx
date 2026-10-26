import { View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { useAuthStore } from "@/lib/auth/auth-store";

import { Text } from "@/components/ui";

import { AccountCard } from "./AccountCard";

/** Who is signed in: the name, then the username (when it is not the name already), email and roles. */
export function IdentityCard() {
  const user = useAuthStore((state) => state.user);
  // Signed out (the gate is about to leave this tab) leaves nobody to show.
  if (user === null) return null;

  const name = user.fullName ?? user.username;
  const roles = MOBILE_LABELS.account.roles(user.roles);

  return (
    <AccountCard>
      <View className="gap-[2px] py-[12px]">
        <Text variant="title">{name}</Text>
        {name === user.username ? null : (
          <Text variant="meta" tone="secondary">
            {user.username}
          </Text>
        )}
        <Text variant="meta" tone="secondary">
          {user.email}
        </Text>
        {roles === "" ? null : (
          <Text variant="meta" tone="secondary">
            {roles}
          </Text>
        )}
      </View>
    </AccountCard>
  );
}
