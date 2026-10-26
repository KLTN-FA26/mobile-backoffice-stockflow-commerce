/** Test render helper: the providers a screen needs, plus an optional signed-in session. */
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";

import { makeQueryClient } from "@/lib/api/query-client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { meKeys } from "@/lib/auth/me-permissions";

import type { AuthUser } from "@/lib/auth/auth-store";
import type { QueryClient } from "@tanstack/react-query";
import type { RenderResult } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";

const SESSION_MS = 3_600_000;

const TEST_USER: AuthUser = {
  userId: "u-test",
  username: "test",
  email: "test@stockflow.vn",
  fullName: "Test",
  status: "ACTIVE",
  roles: [],
  lastLoginAt: null,
};

export interface RenderWithProvidersOptions {
  /** Permission codes the signed-in user holds. Seeded straight into the cache: no API call. */
  permissions?: readonly string[];
  /**
   * Fields merged over a default test user. `null` renders signed out. When omitted, a default
   * user is signed in only if `permissions` is given (permissions need a session to apply to);
   * with no options at all the auth store is left as the test set it.
   */
  user?: Partial<AuthUser> | null;
}

export type RenderWithProvidersResult = RenderResult & { queryClient: QueryClient };

/**
 * The app's own client (`makeQueryClient`): its defaults, the 403 → reload permissions handler and
 * the permission query's own options (`gcTime: 0`) behave as in the app. One override only: no
 * retry, so a failure shows at once instead of after the app's backoff (seconds per retry).
 */
function makeTestQueryClient(): QueryClient {
  const client = makeQueryClient();
  const defaults = client.getDefaultOptions();
  client.setDefaultOptions({
    queries: { ...defaults.queries, retry: false },
    mutations: { ...defaults.mutations, retry: false },
  });
  return client;
}

function signIn(
  queryClient: QueryClient,
  overrides: Partial<AuthUser>,
  permissions: readonly string[],
) {
  const user: AuthUser = { ...TEST_USER, ...overrides };
  useAuthStore.getState().login(user, Date.now() + SESSION_MS);
  // Same shape as MyPermissions, but the codes stay caller-provided strings: production validates
  // them with the permission schema, a test may seed any code.
  queryClient.setQueryData(
    meKeys.sessionPermissions(user.userId, useAuthStore.getState().authorizationVersion),
    { roles: [], permissions: [...permissions], dataScope: "WAREHOUSE" },
  );
}

/** Async because React Native Testing Library 14 renders inside an async `act`. */
export async function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): Promise<RenderWithProvidersResult> {
  const { permissions, user } = options;
  const queryClient = makeTestQueryClient();

  if (user !== null && (user !== undefined || permissions !== undefined)) {
    signIn(queryClient, user ?? {}, permissions ?? []);
  }

  // As in AppProviders: sheets render through the provider's portal, at the end of the tree.
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
    </QueryClientProvider>
  );
  const result = await render(ui, { wrapper });
  return { ...result, queryClient };
}
