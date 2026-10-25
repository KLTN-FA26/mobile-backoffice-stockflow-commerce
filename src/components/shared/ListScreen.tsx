import { FlashList } from "@shopify/flash-list";
import { View } from "react-native";

import { usePullRefresh } from "@/hooks/use-pull-refresh";
import { ApiError } from "@/lib/api/error";
import { classifyLoadError } from "@/lib/api/load-error";

import { Text } from "@/components/ui";

import { EmptyStateNoData, EmptyStateNoResults } from "./EmptyState";
import { FAB_CLEARANCE, ListFab } from "./ListFab";
import {
  EndSpinner,
  LIST_SCREEN_TEST_ID,
  RefetchFailedNotice,
  RowGap,
  StatePanel,
} from "./ListParts";
import { ListSkeleton } from "./ListSkeleton";
import { LoadErrorState } from "./LoadErrorState";
import { RefetchBar } from "./RefetchBar";

import type { ListScreenProps } from "./ListScreenProps";

export type { ListScreenProps } from "./ListScreenProps";

const SCREEN_MARGIN = 16;

/**
 * The body of every list screen: skeleton, error, the two kinds of empty, the rows with infinite
 * scroll and pull-to-refresh, and the create FAB. Data comes in as props; it knows no feature.
 */
export function ListScreen<TItem>({
  status,
  items,
  renderItem,
  keyExtractor,
  header,
  caption,
  hasActiveFilters,
  emptyNoData,
  onClearFilters,
  error,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  onEndReached,
  isRefetching,
  isPlaceholderData = false,
  onRefresh,
  fab,
}: ListScreenProps<TItem>) {
  const { refreshing, onPull } = usePullRefresh(isRefetching, onRefresh);
  const hasRows = items.length > 0;

  // FlashList also calls this when the first page does not fill the screen, which is what we want.
  // Not while the rows are another filter's, and not while a reload runs: asking for the next page
  // then would cancel that reload (TanStack's `fetchNextPage` cancels a running refetch).
  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage && !isRefetching && !isPlaceholderData) onEndReached();
  };

  function renderBody() {
    // Placeholder rows that are none say nothing about the new filters yet: still loading.
    if (status === "pending" || (isPlaceholderData && !hasRows)) return <ListSkeleton />;

    // Nothing to show and the load failed. With rows, the error is a notice over them instead.
    if (status === "error" && !hasRows) {
      return (
        <StatePanel refreshing={refreshing} onRefresh={onPull}>
          <LoadErrorState
            kind={classifyLoadError(error)}
            traceId={error instanceof ApiError ? error.traceId : undefined}
            onRetry={onRetry}
          />
        </StatePanel>
      );
    }

    if (!hasRows) {
      return (
        <StatePanel refreshing={refreshing} onRefresh={onPull}>
          {hasActiveFilters ? (
            <EmptyStateNoResults onClearFilters={onClearFilters} />
          ) : (
            <EmptyStateNoData {...emptyNoData} />
          )}
        </StatePanel>
      );
    }

    return (
      <>
        {status === "error" ? <RefetchFailedNotice busy={isRefetching} onRetry={onRetry} /> : null}
        {caption === undefined ? null : (
          <Text variant="meta" tone="secondary" className="px-4 py-2">
            {caption}
          </Text>
        )}
        <FlashList
          testID={LIST_SCREEN_TEST_ID}
          data={items}
          renderItem={({ item }) => renderItem(item)}
          keyExtractor={keyExtractor}
          ItemSeparatorComponent={RowGap}
          ListFooterComponent={isFetchingNextPage ? <EndSpinner /> : null}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_MARGIN,
            paddingTop: caption === undefined ? SCREEN_MARGIN / 2 : 0,
            paddingBottom: fab === undefined ? SCREEN_MARGIN : FAB_CLEARANCE,
          }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshing={refreshing}
          onRefresh={onPull}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      </>
    );
  }

  return (
    <View className="flex-1">
      {header}
      <RefetchBar visible={isRefetching} />
      {renderBody()}
      {fab === undefined ? null : <ListFab {...fab} />}
    </View>
  );
}
