import type { EmptyStateNoDataProps } from "./EmptyState";
import type { ListFabProps } from "./ListFab";
import type { ReactElement, ReactNode } from "react";

export type ListScreenProps<TItem> = {
  /**
   * `pending` until the first load. A disabled query stays `pending` for good, so a screen whose
   * user may not read the data must render its own no-read state instead of `ListScreen`, or the
   * skeleton never ends. `error` shows the full error screen only while there are no rows; with
   * rows (a failed reload or next page) they stay, under a short notice with a retry.
   */
  status: "pending" | "error" | "success";
  items: TItem[];
  renderItem: (item: TItem) => ReactElement;
  keyExtractor: (item: TItem) => string;
  /** Fixed above the list in every state, so the search box keeps its focus while the list changes. */
  header?: ReactNode;
  /** "Hiển thị x / tổng", over the rows. */
  caption?: string;
  /** Picks which empty state shows: filters that match nothing, or nothing there yet. */
  hasActiveFilters: boolean;
  emptyNoData: EmptyStateNoDataProps;
  onClearFilters: () => void;
  error?: unknown;
  /** The retry of the error screen and of the notice over the rows; give it `refetch`. */
  onRetry?: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onEndReached: () => void;
  isRefetching: boolean;
  /** The rows are those of the previous filters (`keepPreviousData`): they are not paged, and none means loading. */
  isPlaceholderData?: boolean;
  onRefresh: () => void;
  /** Give it only to a user who may create the record. */
  fab?: ListFabProps;
};
