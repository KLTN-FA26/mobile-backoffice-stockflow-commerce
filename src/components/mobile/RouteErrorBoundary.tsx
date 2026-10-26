import { router } from "expo-router";
import { View } from "react-native";
import { ZodError } from "zod";

import { MOBILE_LABELS } from "@/constants/mobile";

import { ApiError } from "@/lib/api/error";
import { classifyLoadError } from "@/lib/api/load-error";

import { LoadErrorState } from "@/components/shared/LoadErrorState";

import { AppProviders } from "@/providers/app-providers";

import { useNavVisibility } from "./use-nav-visibility";

import type { ErrorBoundaryProps } from "expo-router";

/** A failed request or a reply that broke the contract: the load error copy fits. */
function isLoadFailure(error: unknown): boolean {
  return error instanceof ApiError || error instanceof ZodError;
}

/**
 * What a route group shows when one of its screens throws while rendering (spec §3.5). A failed
 * load gets the load error that fits; any other crash is a screen that could not be drawn, said as
 * such, with a way to the first hub the user can see (the same place the app starts on). "Thử lại"
 * either way. Each tab stack exports it as its `ErrorBoundary`, so the tab bar stays usable.
 */
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { firstVisibleHref } = useNavVisibility();
  const loadFailure = isLoadFailure(error);
  return (
    <View className="flex-1 bg-bg-base">
      <LoadErrorState
        kind={loadFailure ? classifyLoadError(error) : "server"}
        title={loadFailure ? undefined : MOBILE_LABELS.renderError.title}
        description={loadFailure ? undefined : MOBILE_LABELS.renderError.description}
        traceId={error instanceof ApiError ? error.traceId : undefined}
        onRetry={() => void retry()}
        secondaryAction={
          loadFailure
            ? undefined
            : {
                label: MOBILE_LABELS.renderError.home,
                // Go there, then clear this boundary: when the hub is in this same tab, navigating
                // alone would leave the error screen up.
                onPress: () => {
                  router.replace(firstVisibleHref);
                  void retry();
                },
              }
        }
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
