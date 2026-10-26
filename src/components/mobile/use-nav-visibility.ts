import { MOBILE_ROUTES } from "@/constants/mobile";

import { useAuthStore } from "@/lib/auth/auth-store";
import { hasPermission, useMyPermissions } from "@/lib/auth/me-permissions";

import { NAV_GROUPS } from "./nav-config";

import type { MobileNavGroup, MobileNavItem } from "./nav-config";
import type { PermissionCode } from "@/lib/auth/me-permissions";

export type NavVisibilityStatus = "pending" | "error" | "ready";

export type VisibleNavGroup = { group: MobileNavGroup; items: MobileNavItem[] };

export type NavVisibility = {
  status: NavVisibilityStatus;
  /** While the permissions are unknown (pending or failed): every group with every item. */
  groups: VisibleNavGroup[];
  /** The hub of the first group with a visible item; the account tab when there is none. */
  firstVisibleHref: string;
  /** Loads the permissions again (after an error). */
  retry: () => void;
  /** The permissions are being loaded again (a retry, or a background refetch). */
  retrying: boolean;
};

/**
 * The web rule (`useCanSeeNavItem`): an item without a code is always shown; a required code must
 * be held; `anyPermission` needs at least one of its codes.
 */
export function canSeeNavItem(
  item: MobileNavItem,
  can: (code: PermissionCode) => boolean,
): boolean {
  return (
    (item.permission === undefined || can(item.permission)) &&
    (item.anyPermission === undefined || item.anyPermission.some(can))
  );
}

const ALL_GROUPS: VisibleNavGroup[] = NAV_GROUPS.map((group) => ({ group, items: group.items }));

/**
 * Which tabs and hub items the signed-in user sees. A tab is never hidden on a guess: until the
 * permissions are known, every group stays, and the hub says it is loading or could not load them.
 * Once known, a failed background refetch (every return to the foreground asks again) keeps the
 * last known grants instead of turning working hubs into an error. A user switch starts a new
 * permission query, so these grants never outlive their session.
 * UI-only — Backend phải re-check every screen an item opens.
 */
export function useNavVisibility(): NavVisibility {
  const authenticated = useAuthStore(
    (state) => state.status === "authenticated" && state.user !== null,
  );
  const query = useMyPermissions();
  // TanStack Query also reports `isError` when a refetch fails with grants cached: only a first
  // load without any grant is an error here. And it puts a query with no data back to "pending"
  // while a retry runs: once the first load has failed, the error stays on screen through the
  // retry (its button spinning) instead of flashing back to the skeleton.
  const failedBefore = query.errorUpdateCount > 0;
  const status: NavVisibilityStatus = !authenticated
    ? "pending"
    : query.data !== undefined
      ? "ready"
      : query.isPending && !failedBefore
        ? "pending"
        : "error";

  const groups =
    status === "ready"
      ? ALL_GROUPS.map(({ group }) => ({
          group,
          items: group.items.filter((item) =>
            canSeeNavItem(item, (code) => hasPermission(query.data, code)),
          ),
        })).filter(({ items }) => items.length > 0)
      : ALL_GROUPS;
  const first = groups[0];

  return {
    status,
    groups,
    firstVisibleHref:
      first === undefined ? MOBILE_ROUTES.hubs.account : MOBILE_ROUTES.hubs[first.group.key],
    retry: () => void query.refetch(),
    retrying: query.isFetching,
  };
}
