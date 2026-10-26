import { Redirect } from "expo-router";

import { MOBILE_LABELS, MOBILE_ROUTES } from "@/constants/mobile";

import { useAuthStore } from "@/lib/auth/auth-store";

import { CenteredSpinner } from "@/components/shared/CenteredSpinner";

import { useNavVisibility } from "./use-nav-visibility";

/**
 * The start route (`/`): login when signed out; otherwise the first hub this user can see, once
 * the permissions are known. The route sits outside the session guard, and the permission query
 * never runs signed out, so the signed-out case must not wait for it.
 */
export function StartRedirect() {
  const authenticated = useAuthStore(
    (state) => state.status === "authenticated" && state.user !== null,
  );
  const { status, firstVisibleHref } = useNavVisibility();

  if (!authenticated) return <Redirect href={MOBILE_ROUTES.login} />;
  // The same wait as the session check just before it, so the hand-over does not jump.
  if (status === "pending") return <CenteredSpinner accessibilityLabel={MOBILE_LABELS.loading} />;
  // On an error every group stays, so this is the first hub, which shows the error and a retry.
  return <Redirect href={firstVisibleHref} />;
}
