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
 * "no permission"; a 403 or a missing code shows the denial.
 */
export function PermissionBoundary({
  permissions,
  mode = "all",
  children,
  variant = "detail",
}: PermissionBoundaryProps) {
  const authenticated = useAuthStore((state) => state.status === "authenticated");
  const query = useMyPermissions();
  if (!authenticated || query.isPending) {
    return variant === "list" ? <ListSkeleton /> : <DetailSkeleton />;
  }
  if (query.isError && !(query.error instanceof ApiError && query.error.status === 403)) {
    return <LoadErrorState kind="permissions" onRetry={() => void query.refetch()} />;
  }
  const holds = (code: PermissionCode) => hasPermission(query.data, code);
  const allowed = mode === "any" ? permissions.some(holds) : permissions.every(holds);
  if (query.isError || !allowed) {
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
