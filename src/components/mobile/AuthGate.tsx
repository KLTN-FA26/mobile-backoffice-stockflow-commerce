import { ShieldAlert } from "lucide-react-native";
import { View } from "react-native";

import { AUTH_UI } from "@/constants/auth";

import { useAuthLifecycle } from "@/lib/auth/use-auth-lifecycle";

import { CenteredSpinner } from "@/components/shared/CenteredSpinner";
import { StateLayout } from "@/components/shared/StateLayout";
import { Button } from "@/components/ui";

import type { AuthStatus } from "@/lib/auth/auth-store";
import type { ReactNode } from "react";

export type KnownAuthStatus = Exclude<AuthStatus, "unknown">;

export type AuthGateProps = {
  /** The app for a known session state: the root layout picks the routes each one may open. */
  children: (status: KnownAuthStatus) => ReactNode;
};

/**
 * Owns the session lifecycle (mounted once, at the root) and holds the app back until the stored
 * session is verified. A failed check offers a retry, never the login screen: the session may well
 * be fine and the server only unreachable (same as the web login page).
 */
export function AuthGate({ children }: AuthGateProps) {
  const { status, bootstrapError, retry } = useAuthLifecycle();

  if (status !== "unknown") return children(status);
  if (bootstrapError === null) return <CenteredSpinner message={AUTH_UI.verifyingSession} />;
  return (
    <View className="flex-1 bg-bg-base">
      <StateLayout icon={ShieldAlert} title={bootstrapError}>
        <Button variant="secondary" label={AUTH_UI.retry} onPress={retry} />
      </StateLayout>
    </View>
  );
}
