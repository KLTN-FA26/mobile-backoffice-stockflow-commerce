import { PERMISSION_UI } from "@/constants/permissions";

import { ApiError } from "@/lib/api/error";
import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermission, useMyPermissions } from "@/lib/auth/me-permissions";

import { DetailSkeleton } from "@/components/shared/DetailSkeleton";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { LoadErrorState } from "@/components/shared/LoadErrorState";

import type { PermissionCode } from "@/lib/auth/me-permissions";
import type { ReactNode } from "react";

export type PermissionBoundaryProps = {
  permissions: readonly PermissionCode[];
  /** "all" (the web behaviour): every code is needed. "any": one of them opens the screen. */
  mode?: "all" | "any";
  children: ReactNode;
  variant?: "list" | "detail";
};

/**
 * Local screen UX, adapted from the web boundary: the session layer owns 401 handling, the backend
 * owns enforcement (Backend phải re-check every request). Waiting shows the screen's skeleton; a
 * permissions load that failed for another reason than 403 offers a retry instead of claiming
 * "no permission"; a 403 or a missing code shows the denial. Those states are for a screen with no
 * grants yet: once grants are known, a refetch that fails (a 401 from the expired session, no
 * network, 503) keeps deciding by them, so the screen and its draft stay mounted (N8, as `Can`).
 */
export function PermissionBoundary({
  permissions,
  mode = "all",
  children,
  variant = "detail",
}: PermissionBoundaryProps) {
  const authenticated = useAuthStore((state) => state.status === "authenticated");
  const query = useMyPermissions();
  const { data } = query;
  if (!authenticated || (data === undefined && !query.isError)) {
    return variant === "list" ? <ListSkeleton /> : <DetailSkeleton />;
  }
  const forbidden = query.error instanceof ApiError && query.error.status === 403;
  if (data === undefined && !forbidden) {
    return <LoadErrorState kind="permissions" onRetry={() => void query.refetch()} />;
  }
  const holds = (code: PermissionCode) => hasPermission(data, code);
  const allowed = mode === "any" ? permissions.some(holds) : permissions.every(holds);
  if (data === undefined || !allowed) {
    return (
      <LoadErrorState
        kind="forbidden"
        title={PERMISSION_UI.deniedTitle}
        description={PERMISSION_UI.deniedDescription}
      />
    );
  }
  return children;
}
