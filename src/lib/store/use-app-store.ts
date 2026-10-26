/**
 * Global UI preferences that outlive the app, persisted through the kv-store, which is synchronous,
 * so the first render already has the saved values.
 *
 * Theme, mute and haptics belong to the phone: they stay for whoever signs in next. The default
 * warehouse belongs to the worker: one entry per `userId` (`defaultWarehouseByUser`), so on a shared
 * phone the next worker neither inherits it nor can act on a warehouse he may not access. Screens
 * read it through `useDefaultWarehouseId()` (`@/hooks`), never from this map. It only pre-fills
 * warehouse filters; it never reaches the API (no `X-Warehouse-Id`).
 */
import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { MOBILE_STORAGE_KEYS } from "@/constants/mobile";

import { kvStateStorage } from "@/lib/platform/storage";

const THEME_PREFERENCES = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

interface AppState {
  theme: ThemePreference;
  /** `userId` → id of that user's default warehouse. A user with none has no key. */
  defaultWarehouseByUser: Record<string, string>;
  muted: boolean;
  hapticsEnabled: boolean;
  setTheme: (theme: ThemePreference) => void;
  /** `null` removes the user's entry. */
  setDefaultWarehouse: (userId: string, warehouseId: string | null) => void;
  setMuted: (muted: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
}

/** What reaches the kv-store: the data fields, any of which a stored record may lack. */
type PersistedPrefs = Partial<
  Pick<AppState, "theme" | "defaultWarehouseByUser" | "muted" | "hapticsEnabled">
>;

/**
 * 1: the default warehouse moved from one device-wide `defaultWarehouseId` to
 * `defaultWarehouseByUser`.
 */
const PERSIST_VERSION = 1;

/**
 * What a stored record may hold, field by field: a field that is missing or not valid (a damaged
 * or hand-edited record, a value from another version) reads as absent, and only that field falls
 * back to its default. Anything else in the record is dropped.
 */
const persistedPrefsSchema = z.object({
  theme: z.enum(THEME_PREFERENCES).optional().catch(undefined),
  defaultWarehouseByUser: z.record(z.string(), z.string()).optional().catch(undefined),
  muted: z.boolean().optional().catch(undefined),
  hapticsEnabled: z.boolean().optional().catch(undefined),
});

/** The usable fields of a stored record; nothing at all when it is not an object. */
function readPersisted(persisted: unknown): PersistedPrefs {
  const parsed = persistedPrefsSchema.safeParse(persisted);
  return parsed.success ? parsed.data : {};
}

/**
 * Version 0 → 1. The device-wide `defaultWarehouseId` is dropped, not handed to anybody: there is
 * no way to know whose it was. The device-wide fields are kept when they are usable.
 */
function migratePersisted(persisted: unknown, version: number): PersistedPrefs {
  if (version >= PERSIST_VERSION) return {};
  const { theme, muted, hapticsEnabled } = readPersisted(persisted);
  return { theme, muted, hapticsEnabled };
}

/**
 * Rehydration reads the record through the schema: a damaged field never reaches the screens
 * (`defaultWarehouseByUser[userId]` on `null`, a theme with no colours), it keeps its default.
 */
function mergePersisted(persisted: unknown, current: AppState): AppState {
  const stored = readPersisted(persisted);
  return {
    ...current,
    theme: stored.theme ?? current.theme,
    defaultWarehouseByUser: stored.defaultWarehouseByUser ?? current.defaultWarehouseByUser,
    muted: stored.muted ?? current.muted,
    hapticsEnabled: stored.hapticsEnabled ?? current.hapticsEnabled,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "system",
      defaultWarehouseByUser: {},
      muted: false,
      hapticsEnabled: true,
      setTheme: (theme) => set({ theme }),
      setDefaultWarehouse: (userId, warehouseId) =>
        set(({ defaultWarehouseByUser }) => {
          const others = Object.fromEntries(
            Object.entries(defaultWarehouseByUser).filter(([id]) => id !== userId),
          );
          return {
            defaultWarehouseByUser:
              warehouseId === null ? others : { ...others, [userId]: warehouseId },
          };
        }),
      setMuted: (muted) => set({ muted }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
    }),
    {
      name: MOBILE_STORAGE_KEYS.appStore,
      storage: createJSONStorage(() => kvStateStorage),
      version: PERSIST_VERSION,
      migrate: migratePersisted,
      merge: mergePersisted,
      partialize: ({ theme, defaultWarehouseByUser, muted, hapticsEnabled }): PersistedPrefs => ({
        theme,
        defaultWarehouseByUser,
        muted,
        hapticsEnabled,
      }),
    },
  ),
);
