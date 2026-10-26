"use client";

import { useCallback } from "react";

import { useAuthStore } from "../auth-store";
import { hasPermission, useMyPermissions } from "../me-permissions";

import type { ReactNode } from "react";
import type { PermissionCode } from "../me-permissions";

/** UX gating only. The backend checks every operation independently. */
export function Can({
  permission,
  fallback = null,
  children,
}: {
  permission: PermissionCode;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  return useCan(permission) ? <>{children}</> : <>{fallback}</>;
}

export function useCan(permission: PermissionCode): boolean {
  return usePermissionChecker()(permission);
}

/**
 * Mobile (adapted): decides on the grants the query holds, not on `isSuccess`. Before the first
 * answer, or when it failed, there are none (no permission). A refetch that fails later (a 401
 * from the expired session, no network, 503) keeps the last known grants, so a gated screen and
 * its unsaved input stay under the re-login sheet (N8, as R39 does for the navigation).
 */
export function usePermissionChecker(): (code: PermissionCode) => boolean {
  const authenticated = useAuthStore(
    (state) => state.status === "authenticated" && state.user !== null,
  );
  const { data } = useMyPermissions();
  return useCallback(
    (code: PermissionCode) => authenticated && hasPermission(data, code),
    [authenticated, data],
  );
}
