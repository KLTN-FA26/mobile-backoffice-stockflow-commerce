import { act, renderHook } from "@testing-library/react-native";
import { z } from "zod";

import { MOBILE_STORAGE_KEYS } from "@/constants/mobile";

import { kv } from "@/lib/platform/storage";

import { usePrefs } from "./use-prefs";

type Config = { pageSize: number; segment: "all" | "mine" };

const DEFAULT_CONFIG: Config = { pageSize: 15, segment: "all" };
const KEY = MOBILE_STORAGE_KEYS.prefs("receipts");

// What a screen does: each stored field is validated, and a missing or wrong one keeps the default.
const storedConfigSchema = z.object({
  pageSize: z.number().int().positive().optional().catch(undefined),
  segment: z.enum(["all", "mine"]).optional().catch(undefined),
});

function merge(stored: Record<string, unknown>, fallback: Config): Config {
  const { pageSize, segment } = storedConfigSchema.parse(stored);
  return { pageSize: pageSize ?? fallback.pageSize, segment: segment ?? fallback.segment };
}

afterEach(() => jest.restoreAllMocks());

describe("usePrefs", () => {
  it("prefs reads stored value synchronously", async () => {
    kv.set(KEY, JSON.stringify({ pageSize: 50, segment: "mine" }));
    const seen: Config[] = [];

    await renderHook(() => {
      const prefs = usePrefs(KEY, DEFAULT_CONFIG, merge);
      seen.push(prefs.config);
      return prefs;
    });

    // The very first render already has the stored value: no flash of the default.
    expect(seen[0]).toEqual({ pageSize: 50, segment: "mine" });
  });

  it("prefs merges missing fields with default", async () => {
    kv.set(KEY, JSON.stringify({ pageSize: 50 }));

    const { result } = await renderHook(() => usePrefs(KEY, DEFAULT_CONFIG, merge));

    expect(result.current.config).toEqual({ pageSize: 50, segment: "all" });
  });

  it("prefs corrupt json falls back", async () => {
    kv.set(KEY, "{not json");

    const { result } = await renderHook(() => usePrefs(KEY, DEFAULT_CONFIG, merge));

    expect(result.current.config).toEqual(DEFAULT_CONFIG);
  });

  it("hands merge the stored record as it is, so a wrong field keeps its default", async () => {
    kv.set(KEY, JSON.stringify({ pageSize: "many", segment: "mine", legacy: true }));

    const { result } = await renderHook(() => usePrefs(KEY, DEFAULT_CONFIG, merge));

    expect(result.current.config).toEqual({ pageSize: 15, segment: "mine" });
  });

  it("falls back without merging when the stored json is not an object", async () => {
    kv.set(KEY, "42");
    const spy = jest.fn(merge);

    const { result } = await renderHook(() => usePrefs(KEY, DEFAULT_CONFIG, spy));

    expect(result.current.config).toEqual(DEFAULT_CONFIG);
    expect(spy).not.toHaveBeenCalled();
  });

  it("falls back when the merge throws on what was stored", async () => {
    kv.set(KEY, JSON.stringify({ pageSize: "many" }));
    const strict = (stored: Record<string, unknown>, fallback: Config): Config => {
      if (typeof stored.pageSize !== "number") throw new Error("pageSize must be a number");
      return { ...fallback, pageSize: stored.pageSize };
    };

    const { result } = await renderHook(() => usePrefs(KEY, DEFAULT_CONFIG, strict));

    expect(result.current.config).toEqual(DEFAULT_CONFIG);
  });

  it("uses the default when nothing is stored, and writes nothing on mount", async () => {
    const { result } = await renderHook(() => usePrefs(KEY, DEFAULT_CONFIG, merge));

    expect(result.current.config).toEqual(DEFAULT_CONFIG);
    expect(kv.get(KEY)).toBeNull();
  });

  it("setConfig stores the value and re-renders with it", async () => {
    const { result } = await renderHook(() => usePrefs(KEY, DEFAULT_CONFIG, merge));

    await act(async () => {
      result.current.setConfig({ pageSize: 25, segment: "mine" });
    });

    expect(result.current.config).toEqual({ pageSize: 25, segment: "mine" });
    expect(JSON.parse(kv.get(KEY) ?? "null")).toEqual({ pageSize: 25, segment: "mine" });
  });

  it("updateConfig builds on the current value, also for two updates in one tick", async () => {
    kv.set(KEY, JSON.stringify({ pageSize: 50 }));
    const { result } = await renderHook(() => usePrefs(KEY, DEFAULT_CONFIG, merge));

    await act(async () => {
      result.current.updateConfig((config) => ({ ...config, segment: "mine" }));
      result.current.updateConfig((config) => ({ ...config, pageSize: config.pageSize + 5 }));
    });

    expect(result.current.config).toEqual({ pageSize: 55, segment: "mine" });
    expect(JSON.parse(kv.get(KEY) ?? "null")).toEqual({ pageSize: 55, segment: "mine" });
  });

  it("keeps the new value for this session when the write fails", async () => {
    jest.spyOn(kv, "set").mockImplementation(() => {
      throw new Error("disk full");
    });
    const { result } = await renderHook(() => usePrefs(KEY, DEFAULT_CONFIG, merge));

    await act(async () => {
      result.current.setConfig({ pageSize: 25, segment: "mine" });
    });

    expect(result.current.config).toEqual({ pageSize: 25, segment: "mine" });
  });
});
