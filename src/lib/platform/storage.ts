import Storage from "expo-sqlite/kv-store";

import type { StateStorage } from "zustand/middleware";

export type KvStore = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
};

/**
 * The one door to the key-value store (`expo-sqlite/kv-store`), synchronous so reads never flash
 * a default. Components go through `usePrefs` / the zustand store, not through this directly.
 * Tokens never belong here — see `@/lib/auth/token-store`.
 */
export const kv: KvStore = {
  get: (key) => Storage.getItemSync(key),
  set: (key, value) => Storage.setItemSync(key, value),
  remove: (key) => {
    Storage.removeItemSync(key);
  },
  keys: () => Storage.getAllKeysSync(),
};

/** Backs zustand `persist` (via `createJSONStorage(() => kvStateStorage)`) with `kv`. */
export const kvStateStorage: StateStorage = {
  getItem: (name) => kv.get(name),
  setItem: (name, value) => kv.set(name, value),
  removeItem: (name) => kv.remove(name),
};
