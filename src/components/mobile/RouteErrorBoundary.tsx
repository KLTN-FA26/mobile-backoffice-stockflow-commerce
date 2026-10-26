import { View } from "react-native";

import { ApiError } from "@/lib/api/error";
import { classifyLoadError } from "@/lib/api/load-error";

import { LoadErrorState } from "@/components/shared/LoadErrorState";

import type { ErrorBoundaryProps } from "expo-router";

/**
 * What a route group shows when one of its screens throws while rendering (spec §3.5): the load
 * error that fits, with "Thử lại" when asking again can help. Each tab stack exports it as its
 * `ErrorBoundary`, so the tab bar stays usable.
 */
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 bg-bg-base">
      <LoadErrorState
        kind={classifyLoadError(error)}
        traceId={error instanceof ApiError ? error.traceId : undefined}
        onRetry={() => void retry()}
      />
    </View>
  );
}
