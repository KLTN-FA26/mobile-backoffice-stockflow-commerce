import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";

import { MOBILE_LABELS } from "@/constants/mobile";

import { useAnnounce } from "@/hooks/use-announce";
import { useThemeColors } from "@/hooks/use-theme-colors";

import { Button, Text } from "@/components/ui";

import type { ReactNode } from "react";

/** Test id of the scroll container of a `ListScreen`: the `FlashList`, or the panel of a state. */
export const LIST_SCREEN_TEST_ID = "list-screen-list";

const FILL: { flexGrow: number } = { flexGrow: 1 };

/** The 8px between two cards. */
export function RowGap() {
  return <View className="h-2" />;
}

/** The footer of a list while its next page loads. */
export function EndSpinner() {
  const colors = useThemeColors();

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={MOBILE_LABELS.loadingMore}
      accessibilityState={{ busy: true }}
      className="items-center py-4"
    >
      <ActivityIndicator size="small" color={colors["ink-tertiary"]} />
    </View>
  );
}

export type StatePanelProps = {
  refreshing: boolean;
  onRefresh: () => void;
  children: ReactNode;
};

/** A full-height state (error, empty) that still takes a pull-down to reload. */
export function StatePanel({ refreshing, onRefresh, children }: StatePanelProps) {
  return (
    <ScrollView
      testID={LIST_SCREEN_TEST_ID}
      contentContainerStyle={FILL}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {children}
    </ScrollView>
  );
}

export type RefetchFailedNoticeProps = {
  /** The retry is already running. */
  busy: boolean;
  onRetry?: () => void;
};

/**
 * A load failed while rows are on screen: the rows stay and this says the data may be out of date.
 * It sits above the list, not in it, so it shows at any scroll position, also after a next page
 * failed at the bottom.
 */
export function RefetchFailedNotice({ busy, onRetry }: RefetchFailedNoticeProps) {
  // Android reads the live region below by itself; iOS has none.
  useAnnounce(MOBILE_LABELS.refetchFailed);

  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row items-center justify-between gap-3 border-b border-border-default bg-bg-subtle px-4 py-2"
    >
      <Text variant="meta" tone="danger" className="min-w-0 flex-1">
        {MOBILE_LABELS.refetchFailed}
      </Text>
      {onRetry === undefined ? null : (
        <Button
          size="sm"
          variant="secondary"
          label={MOBILE_LABELS.retry}
          loading={busy}
          onPress={onRetry}
        />
      )}
    </View>
  );
}
