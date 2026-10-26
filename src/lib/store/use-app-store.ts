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
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { MOBILE_STORAGE_KEYS } from "@/constants/mobile";

import { kvStateStorage } from "@/lib/platform/storage";

export type ThemePreference = "system" | "light" | "dark";

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Version 0 → 1. The device-wide `defaultWarehouseId` is dropped, not handed to anybody: there is
 * no way to know whose it was. The device-wide fields are kept when they are usable.
 */
function migratePersisted(persisted: unknown, version: number): PersistedPrefs {
  if (version >= PERSIST_VERSION || !isRecord(persisted)) return {};
  const prefs: PersistedPrefs = {};
  const { theme, muted, hapticsEnabled } = persisted;
  if (theme === "system" || theme === "light" || theme === "dark") prefs.theme = theme;
  if (typeof muted === "boolean") prefs.muted = muted;
  if (typeof hapticsEnabled === "boolean") prefs.hapticsEnabled = hapticsEnabled;
  return prefs;
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
      partialize: ({ theme, defaultWarehouseByUser, muted, hapticsEnabled }): PersistedPrefs => ({
        theme,
        defaultWarehouseByUser,
        muted,
        hapticsEnabled,
      }),
    },
  ),
);
