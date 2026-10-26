/**
 * Mobile-only test for the adapted port (the web has none for this module): what changed against the
 * web file is the shape of `params` (a plain object, not `URLSearchParams`) and the directory key
 * (no `warehouseId`, so `useWarehouseDirectory` never reads the app store).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import MockAdapter from "axios-mock-adapter";
import { createElement } from "react";

import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { useAppStore } from "@/lib/store/use-app-store";

import {
  fetchActiveWarehouseOptions,
  fetchWarehouseDirectory,
  useWarehouseDirectory,
  useWarehouseOptions,
  warehouseOptionKeys,
} from "./warehouse-options";

import type { ReactNode } from "react";

jest.mock("@/lib/config", () => ({
  APP_CONFIG: { ok: true, apiUrl: "https://api.test/api/v1" },
}));

const http = new MockAdapter(api);

const BE_ROW = { id: "wh-hn", prefix: "HN", name: "Kho Hà Nội", status: "ACTIVE" };
const LEGACY_ROW = { warehouseId: "wh-dn", code: "DN", name: "Kho Đà Nẵng", active: false };
const page = (items: readonly object[]) => ({ success: true, data: { items } });

const ACTIVE_PARAMS = { page: 0, size: 200, status: "ACTIVE", sort: "name,asc" };
const DIRECTORY_PARAMS = { page: 0, size: 200, sort: "name,asc" };

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return { client, Wrapper };
}

beforeEach(() => {
  http.reset();
});

describe("warehouse options requests", () => {
  it("the active list asks for active warehouses with an object params", async () => {
    http.onGet("/warehouses", { params: ACTIVE_PARAMS }).reply(200, page([BE_ROW]));

    await expect(fetchActiveWarehouseOptions()).resolves.toEqual([
      { warehouseId: "wh-hn", code: "HN", name: "Kho Hà Nội", active: true },
    ]);
    expect(http.history.get[0]?.params).toEqual(ACTIVE_PARAMS);
  });

  it("the directory asks for every status", async () => {
    http.onGet("/warehouses", { params: DIRECTORY_PARAMS }).reply(200, page([BE_ROW, LEGACY_ROW]));

    await expect(fetchWarehouseDirectory()).resolves.toEqual([
      { warehouseId: "wh-hn", code: "HN", name: "Kho Hà Nội", active: true },
      { warehouseId: "wh-dn", code: "DN", name: "Kho Đà Nẵng", active: false },
    ]);
    expect(http.history.get[0]?.params).toEqual(DIRECTORY_PARAMS);
    expect(http.history.get[0]?.params).not.toHaveProperty("status");
  });

  it("a warehouse without an id fails the whole page", async () => {
    http.onGet("/warehouses").reply(200, page([{ name: "Kho không id" }]));

    await expect(fetchActiveWarehouseOptions()).rejects.toThrow("Kho thiếu id");
  });

  it("a failed request rejects with the api error", async () => {
    http.onGet("/warehouses").reply(500, { success: false, message: "boom" });

    await expect(fetchActiveWarehouseOptions()).rejects.toBeInstanceOf(ApiError);
  });
});

describe("warehouse option query keys", () => {
  it("the directory key does not depend on a warehouse", () => {
    expect(warehouseOptionKeys.directory()).toEqual(["references", "warehouses", "directory"]);
    expect(warehouseOptionKeys.active()).toEqual(["references", "warehouses", "active"]);
  });
});

describe("warehouse option hooks", () => {
  it("useWarehouseOptions loads the active list under the active key", async () => {
    http.onGet("/warehouses").reply(200, page([BE_ROW]));
    const { client, Wrapper } = wrapper();

    const { result } = await renderHook(() => useWarehouseOptions(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((w) => w.warehouseId)).toEqual(["wh-hn"]);
    expect(client.getQueryData(warehouseOptionKeys.active())).toBe(result.current.data);
  });

  it("useWarehouseDirectory does not read the app store and honours enabled", async () => {
    http.onGet("/warehouses").reply(200, page([BE_ROW, LEGACY_ROW]));
    useAppStore.getState().setDefaultWarehouse("u-alice", "wh-hn");
    const { client, Wrapper } = wrapper();

    const idle = await renderHook(() => useWarehouseDirectory(false), { wrapper: Wrapper });
    expect(idle.result.current.fetchStatus).toBe("idle");
    expect(http.history.get).toHaveLength(0);
    await idle.unmount();

    const { result } = await renderHook(() => useWarehouseDirectory(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(client.getQueryData(warehouseOptionKeys.directory())).toBe(result.current.data);
  });
});
