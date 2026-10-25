/** Test render helper: the providers a screen needs, plus an optional signed-in session. */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";

import { useAuthStore } from "@/lib/auth/auth-store";
import { meKeys } from "@/lib/auth/me-permissions";

import type { AuthUser } from "@/lib/auth/auth-store";
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

function makeTestQueryClient(): QueryClient {
  return new QueryClient({
    // gcTime Infinity: seeded data is never evicted in the middle of a test.
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
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

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const result = await render(ui, { wrapper });
  return { ...result, queryClient };
}
