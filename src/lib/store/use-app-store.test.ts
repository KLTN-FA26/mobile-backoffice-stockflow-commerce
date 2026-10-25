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
      defaultWarehouseId: null,
      muted: false,
      hapticsEnabled: true,
    });
  });

  it("setters update their own field only", () => {
    state().setTheme("light");
    state().setDefaultWarehouseId("wh-1");
    state().setMuted(true);
    state().setHapticsEnabled(false);
    expect(state()).toMatchObject({
      theme: "light",
      defaultWarehouseId: "wh-1",
      muted: true,
      hapticsEnabled: false,
    });

    state().setDefaultWarehouseId(null);
    expect(state().defaultWarehouseId).toBeNull();
    expect(state().theme).toBe("light");
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
        state: { theme: "dark", defaultWarehouseId: "wh-9", muted: true, hapticsEnabled: false },
        version: 0,
      }),
    );
    await useAppStore.persist.rehydrate();
    expect(state()).toMatchObject({
      theme: "dark",
      defaultWarehouseId: "wh-9",
      muted: true,
      hapticsEnabled: false,
    });
  });
});
