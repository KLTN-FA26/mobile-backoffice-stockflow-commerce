import { View } from "react-native";

import { SHADOW_SM } from "@/lib/tokens";

import type { ReactNode } from "react";

/** The card the account tab puts its rows in when they need no title (`Section` is the titled one). */
export function AccountCard({ children }: { children: ReactNode }) {
  return (
    <View
      className="rounded-md border border-border-default bg-bg-surface px-[16px] py-[4px]"
      style={SHADOW_SM}
    >
      {children}
    </View>
  );
}
