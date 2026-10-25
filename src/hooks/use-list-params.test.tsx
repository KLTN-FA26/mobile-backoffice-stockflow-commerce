import { router } from "expo-router";
import { act, renderRouter } from "expo-router/testing-library";
import { useEffect } from "react";

import { UI_LIMITS } from "@/constants/mobile";

import { useListParams } from "./use-list-params";

type Filters = { q: string; status: string[]; sort: string; warehouse: string[] };

// A module-level constant, as screens use it: `useListParams` compares against it on every render.
const DEFAULTS: Filters = { q: "", status: [], sort: "", warehouse: ["W1"] };

let latest: ReturnType<typeof useListParams<Filters>> | undefined;

function Probe() {
  const list = useListParams(DEFAULTS);
  useEffect(() => {
    latest = list;
  });
  return null;
}

function current(): ReturnType<typeof useListParams<Filters>> {
  if (latest === undefined) throw new Error("the probe screen has not rendered");
  return latest;
}

async function open(url: string) {
  latest = undefined;
  return renderRouter({ x: Probe }, { initialUrl: url });
}

afterEach(() => {
  latest = undefined;
  jest.restoreAllMocks();
});

describe("useListParams", () => {
  it("list params parse comma arrays", async () => {
    await open("/x?status=A,B&q=hello");

    expect(current().params).toEqual({
      q: "hello",
      status: ["A", "B"],
      sort: "",
      warehouse: ["W1"],
    });
  });

  it("falls back to the defaults for what the url does not have", async () => {
    await open("/x");

    expect(current().params).toEqual(DEFAULTS);
    expect(current().activeFilterCount).toBe(0);
  });

  it("reads a repeated key as an array and an empty value as an empty array", async () => {
    await open("/x?status=A&status=B,C&warehouse=");

    expect(current().params.status).toEqual(["A", "B", "C"]);
    expect(current().params.warehouse).toEqual([]);
  });

  it("setParam writes route params", async () => {
    const view = await open("/x");

    await act(async () => {
      current().setParam("status", ["A", "B"]);
    });

    expect(view.getSearchParams()).toMatchObject({ status: "A,B" });
    expect(current().params.status).toEqual(["A", "B"]);
  });

  it("writes a plain string as it is", async () => {
    const view = await open("/x");

    await act(async () => {
      current().setParam("sort", "receivedAt");
    });

    expect(view.getSearchParams()).toMatchObject({ sort: "receivedAt" });
    expect(current().params.sort).toBe("receivedAt");
  });

  it("setParams changes several keys in one navigation update", async () => {
    await open("/x");
    const setParams = jest.spyOn(router, "setParams");

    await act(async () => {
      current().setParams({ status: ["A"], sort: "name" });
    });

    expect(setParams).toHaveBeenCalledTimes(1);
    expect(current().params).toMatchObject({ status: ["A"], sort: "name" });
  });

  it("drops a key from the url when it is set back to its default", async () => {
    const view = await open("/x?status=A&sort=name");

    await act(async () => {
      current().setParam("status", []);
    });

    // Removed from the route, not written as an empty value (which would read the same).
    expect(view.getSearchParams().status).toBeUndefined();
    expect(view.getSearchParams().sort).toBe("name");
    expect(current().params.status).toEqual([]);
    expect(current().activeFilterCount).toBe(0);
  });

  it("keeps a pre-filled filter cleared once the user clears it", async () => {
    await open("/x");
    expect(current().params.warehouse).toEqual(["W1"]);

    await act(async () => {
      current().setParam("warehouse", []);
    });

    expect(current().params.warehouse).toEqual([]);
    expect(current().activeFilterCount).toBe(1);
  });

  it("reset puts every key back to its default", async () => {
    await open("/x?q=hello&status=A&sort=name&warehouse=W2");

    await act(async () => {
      current().reset();
    });

    expect(current().params).toEqual(DEFAULTS);
    expect(current().activeFilterCount).toBe(0);
  });

  it("activeFilterCount ignores q", async () => {
    await open("/x?q=hello");
    expect(current().activeFilterCount).toBe(0);

    await act(async () => {
      current().setParam("status", ["A", "B"]);
    });
    expect(current().activeFilterCount).toBe(1);

    await act(async () => {
      current().setParam("warehouse", ["W2"]);
    });
    expect(current().activeFilterCount).toBe(2);
  });

  it("activeFilterCount ignores sort", async () => {
    // Sorting is not filtering: a screen's "Bộ lọc" count and its empty state must not react to it.
    await open("/x?sort=name");
    expect(current().params.sort).toBe("name");
    expect(current().activeFilterCount).toBe(0);

    await act(async () => {
      current().setParam("status", ["A"]);
    });
    expect(current().activeFilterCount).toBe(1);
  });

  it("does not count a value that equals its default", async () => {
    await open("/x?warehouse=W1");

    expect(current().activeFilterCount).toBe(0);
  });

  it("debouncedQ starts with the q of the url and follows a change after the debounce", async () => {
    await open("/x?q=first");
    expect(current().debouncedQ).toBe("first");

    await act(async () => {
      current().setParam("q", "second");
    });
    expect(current().params.q).toBe("second");
    expect(current().debouncedQ).toBe("first");

    await act(async () => {
      jest.advanceTimersByTime(UI_LIMITS.searchDebounceMs);
    });
    expect(current().debouncedQ).toBe("second");
  });
});
