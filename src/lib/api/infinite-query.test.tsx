import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { PAGE_SIZE } from "@/constants";

import { createInfiniteListQuery } from "./infinite-query";
import { createQueryKeys } from "./query-factory";

import type { PaginatedResponse } from "./query-factory";
import type { ReactNode } from "react";

type Row = { id: string };
type Params = { q: string };
type FetchParams = Params & { page: number; size: number };

const keys = createQueryKeys<Params>("things");

function pageOf(
  items: Row[],
  page: number,
  hasNext: boolean,
  totalElements = 3,
): PaginatedResponse<Row> {
  return {
    items,
    page,
    size: items.length,
    totalElements,
    totalPages: 2,
    hasNext,
    hasPrevious: page > 0,
  };
}

/** A promise the test settles by hand, to look at the state while a request is on its way. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function twoPages(): jest.Mock<Promise<PaginatedResponse<Row>>, [FetchParams, AbortSignal?]> {
  return jest
    .fn<Promise<PaginatedResponse<Row>>, [FetchParams, AbortSignal?]>()
    .mockResolvedValueOnce(pageOf([{ id: "a" }, { id: "b" }], 0, true))
    .mockResolvedValueOnce(pageOf([{ id: "c" }], 1, false));
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe("createInfiniteListQuery", () => {
  it("infinite query flattens pages and stops when hasNext false", async () => {
    const fetcher = twoPages();
    const useList = createInfiniteListQuery(keys, fetcher);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useList({ q: "x" }), { wrapper });

    await waitFor(() => expect(result.current.items).toEqual([{ id: "a" }, { id: "b" }]));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(result.current.items).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }]);
    expect(result.current.hasNextPage).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
    // Pages are zero-based, and each request carries the filters and the page size.
    expect(fetcher.mock.calls[0]?.[0]).toEqual({ q: "x", page: 0, size: PAGE_SIZE.md });
    expect(fetcher.mock.calls[1]?.[0]).toEqual({ q: "x", page: 1, size: PAGE_SIZE.md });
  });

  it("infinite query exposes totalElements from first page", async () => {
    const first = deferred<PaginatedResponse<Row>>();
    const fetcher = jest
      .fn<Promise<PaginatedResponse<Row>>, [FetchParams, AbortSignal?]>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(pageOf([{ id: "b" }], 1, false, 41));
    const useList = createInfiniteListQuery(keys, fetcher);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useList({ q: "" }), { wrapper });

    // Nothing has loaded yet: no total, no items.
    expect(result.current.totalElements).toBeNull();
    expect(result.current.items).toEqual([]);

    await act(async () => {
      first.resolve(pageOf([{ id: "a" }], 0, true, 42));
    });
    await waitFor(() => expect(result.current.totalElements).toBe(42));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    // The second page reports 41, but the total is the first page's.
    expect(result.current.items).toHaveLength(2);
    expect(result.current.totalElements).toBe(42);
  });

  it("keeps the same items array until the data changes", async () => {
    const useList = createInfiniteListQuery(keys, twoPages());
    const { wrapper } = setup();
    const { result, rerender } = await renderHook(() => useList({ q: "" }), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    const before = result.current.items;
    await rerender({});

    expect(result.current.items).toBe(before);
  });

  it("changing params keeps previous items while the new page loads", async () => {
    const next = deferred<PaginatedResponse<Row>>();
    const fetcher = jest
      .fn<Promise<PaginatedResponse<Row>>, [FetchParams, AbortSignal?]>()
      .mockResolvedValueOnce(pageOf([{ id: "a" }, { id: "b" }], 0, true, 5))
      .mockReturnValueOnce(next.promise);
    const useList = createInfiniteListQuery(keys, fetcher);
    const { wrapper } = setup();
    const { result, rerender } = await renderHook((params: Params) => useList(params), {
      wrapper,
      initialProps: { q: "x" },
    });
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.isPlaceholderData).toBe(false);

    await rerender({ q: "y" });

    // The rows of "x" stay up while "y" loads: flagged as placeholder, and the load reads as a reload.
    expect(result.current.items).toEqual([{ id: "a" }, { id: "b" }]);
    expect(result.current.totalElements).toBe(5);
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.isRefetching).toBe(true);
    expect(fetcher.mock.calls[1]?.[0]).toEqual({ q: "y", page: 0, size: PAGE_SIZE.md });

    await act(async () => {
      next.resolve(pageOf([{ id: "c" }], 0, false, 1));
    });
    await waitFor(() => expect(result.current.items).toEqual([{ id: "c" }]));
    expect(result.current.isPlaceholderData).toBe(false);
    expect(result.current.totalElements).toBe(1);
  });

  it("passes the abort signal to the fetcher", async () => {
    const fetcher = twoPages();
    const useList = createInfiniteListQuery(keys, fetcher);
    const { wrapper } = setup();
    await renderHook(() => useList({ q: "" }), { wrapper });

    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
  });

  it("uses the given page size", async () => {
    const fetcher = twoPages();
    const useList = createInfiniteListQuery(keys, fetcher, 50);
    const { wrapper } = setup();
    await renderHook(() => useList({ q: "" }), { wrapper });

    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher.mock.calls[0]?.[0].size).toBe(50);
  });

  it("caches under the list key plus infinite", async () => {
    const useList = createInfiniteListQuery(keys, twoPages());
    const { queryClient, wrapper } = setup();
    const { result } = await renderHook(() => useList({ q: "x" }), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    expect(queryClient.getQueryData([...keys.list({ q: "x" }), "infinite"])).toBeDefined();
  });

  it("does not fetch while disabled", async () => {
    const fetcher = twoPages();
    const useList = createInfiniteListQuery(keys, fetcher);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useList({ q: "" }, { enabled: false }), { wrapper });

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.items).toEqual([]);
    expect(result.current.totalElements).toBeNull();
  });

  it("is not refetching while it loads the next page", async () => {
    const second = deferred<PaginatedResponse<Row>>();
    const fetcher = jest
      .fn<Promise<PaginatedResponse<Row>>, [FetchParams, AbortSignal?]>()
      .mockResolvedValueOnce(pageOf([{ id: "a" }], 0, true))
      .mockReturnValueOnce(second.promise);
    const useList = createInfiniteListQuery(keys, fetcher);
    const { wrapper } = setup();
    const { result } = await renderHook(() => useList({ q: "" }), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      void result.current.fetchNextPage();
    });

    expect(result.current.isFetchingNextPage).toBe(true);
    expect(result.current.isRefetching).toBe(false);

    await act(async () => {
      second.resolve(pageOf([{ id: "b" }], 1, false));
    });
    await waitFor(() => expect(result.current.items).toHaveLength(2));
  });
});
