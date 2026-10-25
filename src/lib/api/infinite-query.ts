/**
 * Infinite list query factory — the mobile replacement for the page-by-page `createListQuery`.
 *
 * The web list shows one page at a time (DataTable + page number); the phone list scrolls and keeps
 * asking for the next page while the backend says `hasNext`. Pages are zero-based, as in the BE
 * `PageResponse`.
 *
 * Usage:
 *   const useReceipts = createInfiniteListQuery(receiptKeys, listGoodsReceipts);
 *   const { items, totalElements, hasNextPage, fetchNextPage } = useReceipts(params);
 */

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { PAGE_SIZE } from "@/constants";

import { QUERY_TIMES } from "./query-client";

import type { QueryKeys, PaginatedResponse } from "./query-factory";
import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";

export type InfiniteListResult<TItem> = UseInfiniteQueryResult<
  InfiniteData<PaginatedResponse<TItem>>
> & {
  /**
   * Every loaded page, in order. The same array until the data changes (it feeds `FlashList`).
   * While `isPlaceholderData` is true these are the rows of the previous params.
   */
  items: TItem[];
  /** The total the first page reported; `null` until it has loaded. */
  totalElements: number | null;
};

export function createInfiniteListQuery<TItem, TParams extends Record<string, unknown>>(
  keys: QueryKeys<TParams>,
  fetcher: (
    params: TParams & { page: number; size: number },
    signal?: AbortSignal,
  ) => Promise<PaginatedResponse<TItem>>,
  size: number = PAGE_SIZE.md,
) {
  return function useInfiniteList(
    params: TParams,
    /**
     * Per-call options. `enabled: false` leaves the query `pending` for good: it never turns
     * `success` or `error`. A screen whose user may not read the data (`enabled: canRead`) must
     * therefore render its own no-read state instead of `ListScreen`, or the skeleton never ends.
     */
    options?: { enabled?: boolean },
  ): InfiniteListResult<TItem> {
    const query = useInfiniteQuery({
      queryKey: [...keys.list(params), "infinite"],
      queryFn: ({ pageParam, signal }) => fetcher({ ...params, page: pageParam, size }, signal),
      // A filter or search change keeps the old rows up (`isPlaceholderData`) until the new first
      // page arrives, as web's `createListQuery` does, instead of blanking the list to a skeleton.
      placeholderData: keepPreviousData,
      initialPageParam: 0,
      getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
      ...QUERY_TIMES.list,
      enabled: options?.enabled,
    });

    // Memoised on purpose: a new array on every render would make FlashList re-process the list.
    const items = useMemo(
      () => query.data?.pages.flatMap((page) => page.items) ?? [],
      [query.data],
    );
    const totalElements = query.data?.pages[0]?.totalElements ?? null;

    return { ...query, items, totalElements };
  };
}
