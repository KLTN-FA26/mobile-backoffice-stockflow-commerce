/**
 * Global UI preferences that outlive the app: theme, default warehouse, mute and haptics. Persisted
 * through the kv-store, which is synchronous, so the first render already has the saved values.
 * The default warehouse only pre-fills warehouse filters; it never reaches the API (no
 * `X-Warehouse-Id`).
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { MOBILE_STORAGE_KEYS } from "@/constants/mobile";

import { kvStateStorage } from "@/lib/platform/storage";

export type ThemePreference = "system" | "light" | "dark";

interface AppState {
  theme: ThemePreference;
  defaultWarehouseId: string | null;
  muted: boolean;
  hapticsEnabled: boolean;
  setTheme: (theme: ThemePreference) => void;
  setDefaultWarehouseId: (warehouseId: string | null) => void;
  setMuted: (muted: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "system",
      defaultWarehouseId: null,
      muted: false,
      hapticsEnabled: true,
      setTheme: (theme) => set({ theme }),
      setDefaultWarehouseId: (defaultWarehouseId) => set({ defaultWarehouseId }),
      setMuted: (muted) => set({ muted }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
    }),
    {
      name: MOBILE_STORAGE_KEYS.appStore,
      storage: createJSONStorage(() => kvStateStorage),
    },
  ),
);
