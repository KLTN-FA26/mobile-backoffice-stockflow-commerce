import { useAuthStore } from "@/lib/auth/auth-store";
import { useAppStore } from "@/lib/store/use-app-store";

/**
 * The signed-in user's default warehouse id, or null (nobody signed in, or none chosen). The one
 * way screens read it, to pre-fill a warehouse filter: it only suggests a value, it is never an
 * API parameter (no `X-Warehouse-Id`), and the user can change the filter.
 *
 * Both stores are read in the same render, so after a user switch the new user never sees the
 * previous one's warehouse, not even for one commit. The id may name a warehouse that is no longer
 * active; a screen offering warehouse options checks it against them.
 */
export function useDefaultWarehouseId(): string | null {
  const userId = useAuthStore((state) => state.user?.userId ?? null);
  return useAppStore((state) =>
    userId === null ? null : (state.defaultWarehouseByUser[userId] ?? null),
  );
}
