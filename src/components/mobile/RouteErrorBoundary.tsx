import { View } from "react-native";

import { ApiError } from "@/lib/api/error";
import { classifyLoadError } from "@/lib/api/load-error";

import { LoadErrorState } from "@/components/shared/LoadErrorState";

import { AppProviders } from "@/providers/app-providers";

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

/**
 * The root layout's boundary: what no deeper one caught (the login screen, the gates). It replaces
 * the whole root layout, `AppProviders` included, so it brings them back: the theme's colour
 * variables, safe area and gesture root the error screen needs.
 */
export function RootErrorBoundary(props: ErrorBoundaryProps) {
  return (
    <AppProviders>
      <RouteErrorBoundary {...props} />
    </AppProviders>
  );
}
