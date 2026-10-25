import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

import { kv, kvStateStorage } from "./storage";

function clearKv(): void {
  kv.keys().forEach((key) => kv.remove(key));
}

describe("kv", () => {
  afterEach(clearKv);

  it("returns null for a missing key", () => {
    expect(kv.get("missing")).toBeNull();
  });

  it("stores, reads and removes a value", () => {
    kv.set("a", "1");
    expect(kv.get("a")).toBe("1");
    kv.remove("a");
    expect(kv.get("a")).toBeNull();
  });

  it("removing a missing key does not throw", () => {
    expect(() => kv.remove("missing")).not.toThrow();
  });

  it("lists every stored key", () => {
    kv.set("a", "1");
    kv.set("b", "2");
    expect([...kv.keys()].sort()).toEqual(["a", "b"]);
  });
});

describe("kvStateStorage", () => {
  afterEach(clearKv);

  it("reads and writes through kv", () => {
    kvStateStorage.setItem("store", '{"state":{}}');
    expect(kv.get("store")).toBe('{"state":{}}');
    expect(kvStateStorage.getItem("store")).toBe('{"state":{}}');
    kvStateStorage.removeItem("store");
    expect(kv.get("store")).toBeNull();
  });

  it("returns null for a missing item", () => {
    expect(kvStateStorage.getItem("missing")).toBeNull();
  });

  it("persists and rehydrates a zustand store", async () => {
    const options = {
      name: "test-store",
      storage: createJSONStorage(() => kvStateStorage),
    };
    const first = createStore(persist(() => ({ muted: false }), options));
    first.setState({ muted: true });
    expect(kv.get("test-store")).toContain('"muted":true');

    const second = createStore(persist(() => ({ muted: false }), options));
    await second.persist.rehydrate();
    expect(second.getState().muted).toBe(true);
  });
});
