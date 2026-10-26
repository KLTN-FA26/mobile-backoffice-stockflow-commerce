import { MOBILE_STORAGE_KEYS } from "@/constants/mobile";

import { kv } from "@/lib/platform/storage";

import { useAppStore } from "./use-app-store";

const state = () => useAppStore.getState();

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState(), true);
});

describe("app store", () => {
  it("defaults", () => {
    expect(state()).toMatchObject({
      theme: "system",
      defaultWarehouseByUser: {},
      muted: false,
      hapticsEnabled: true,
    });
  });

  it("setters update their own field only", () => {
    state().setTheme("light");
    state().setDefaultWarehouse("u-1", "wh-1");
    state().setMuted(true);
    state().setHapticsEnabled(false);
    expect(state()).toMatchObject({
      theme: "light",
      defaultWarehouseByUser: { "u-1": "wh-1" },
      muted: true,
      hapticsEnabled: false,
    });

    state().setDefaultWarehouse("u-1", null);
    expect(state().defaultWarehouseByUser).toEqual({});
    expect(state().theme).toBe("light");
  });

  it("keeps one default warehouse per user and changes only that user's entry", () => {
    state().setDefaultWarehouse("u-1", "wh-1");
    state().setDefaultWarehouse("u-2", "wh-2");
    expect(state().defaultWarehouseByUser).toEqual({ "u-1": "wh-1", "u-2": "wh-2" });

    state().setDefaultWarehouse("u-1", "wh-3");
    expect(state().defaultWarehouseByUser).toEqual({ "u-1": "wh-3", "u-2": "wh-2" });

    // Clearing a user removes the key (no `null` left behind) and leaves the others alone; clearing
    // a user who has none is not an error.
    state().setDefaultWarehouse("u-2", null);
    state().setDefaultWarehouse("u-9", null);
    expect(state().defaultWarehouseByUser).toEqual({ "u-1": "wh-3" });
  });

  it("persists the per-user default warehouses to kv store", () => {
    state().setDefaultWarehouse("u-1", "wh-1");
    expect(JSON.parse(kv.get(MOBILE_STORAGE_KEYS.appStore) ?? "{}")).toMatchObject({
      state: { defaultWarehouseByUser: { "u-1": "wh-1" } },
    });
  });

  it("persists theme to kv store", () => {
    state().setTheme("dark");
    const raw = kv.get(MOBILE_STORAGE_KEYS.appStore);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? "{}")).toMatchObject({ state: { theme: "dark" } });
  });

  it("restores saved preferences on rehydrate", async () => {
    kv.set(
      MOBILE_STORAGE_KEYS.appStore,
      JSON.stringify({
        state: {
          theme: "dark",
          defaultWarehouseByUser: { "u-9": "wh-9" },
          muted: true,
          hapticsEnabled: false,
        },
        version: 1,
      }),
    );
    await useAppStore.persist.rehydrate();
    expect(state()).toMatchObject({
      theme: "dark",
      defaultWarehouseByUser: { "u-9": "wh-9" },
      muted: true,
      hapticsEnabled: false,
    });
  });

  describe("migration from the device-wide default warehouse (version 0)", () => {
    const legacy = {
      state: { theme: "dark", defaultWarehouseId: "wh-9", muted: true, hapticsEnabled: false },
      version: 0,
    };

    it("drops the legacy field and keeps the device-wide preferences", async () => {
      // Whose warehouse it was cannot be known, so no user inherits it.
      kv.set(MOBILE_STORAGE_KEYS.appStore, JSON.stringify(legacy));

      await useAppStore.persist.rehydrate();

      expect(state()).toMatchObject({
        theme: "dark",
        defaultWarehouseByUser: {},
        muted: true,
        hapticsEnabled: false,
      });
      expect(state()).not.toHaveProperty("defaultWarehouseId");
    });

    it("writes the migrated state back, at the new version, without the legacy field", async () => {
      kv.set(MOBILE_STORAGE_KEYS.appStore, JSON.stringify(legacy));

      await useAppStore.persist.rehydrate();

      const raw = kv.get(MOBILE_STORAGE_KEYS.appStore) ?? "{}";
      expect(JSON.parse(raw)).toMatchObject({
        version: 1,
        state: { theme: "dark", defaultWarehouseByUser: {}, muted: true, hapticsEnabled: false },
      });
      expect(raw).not.toContain("defaultWarehouseId");
    });

    it("keeps only what is usable of a damaged version 0 record", async () => {
      kv.set(
        MOBILE_STORAGE_KEYS.appStore,
        JSON.stringify({
          state: { theme: "neon", defaultWarehouseId: 5, muted: "yes", hapticsEnabled: false },
          version: 0,
        }),
      );

      await useAppStore.persist.rehydrate();

      expect(state()).toMatchObject({
        theme: "system",
        defaultWarehouseByUser: {},
        muted: false,
        hapticsEnabled: false,
      });
    });
  });
});
