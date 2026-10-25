import { useEffect } from "react";
import { AppState } from "react-native";

import { setUnauthorizedHandler } from "@/lib/api/client";

import { bootstrapSession, handleUnauthorized, revalidateSession } from "./auth-session";
import { useAuthStore } from "./auth-store";

import type { AuthStatus } from "./auth-store";
import type { AppStateStatus } from "react-native";

export interface AuthLifecycle {
  status: AuthStatus;
  bootstrapError: string | null;
  retry: () => void;
}

const retry = () => {
  void bootstrapSession();
};

// Back in the foreground: check a session on screen in the background (it may have been revoked
// or have expired while away) and give a failed bootstrap another go. A signed-out app stays
// quiet. Replaces the web's window focus and cross-tab session events.
function onAppStateChange(state: AppStateStatus) {
  if (state !== "active") return;
  const { status } = useAuthStore.getState();
  if (status === "authenticated") void revalidateSession();
  else if (status === "unknown") void bootstrapSession();
}

/** Mounted once at the root: owns the bootstrap, the 401 handler and foreground checks. */
export function useAuthLifecycle(): AuthLifecycle {
  const status = useAuthStore((state) => state.status);
  const bootstrapError = useAuthStore((state) => state.bootstrapError);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    if (useAuthStore.getState().status === "unknown") void bootstrapSession();
    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => {
      subscription.remove();
      setUnauthorizedHandler(null);
    };
  }, []);

  return { status, bootstrapError, retry };
}
