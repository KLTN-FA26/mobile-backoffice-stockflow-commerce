import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import MockAdapter from "axios-mock-adapter";
import { Text } from "react-native";

import { UI_LABELS } from "@/constants";
import { MOBILE_LABELS } from "@/constants/mobile";
import { PERMISSION_QUERY, PERMISSION_UI, SUPPLIER_PERMISSIONS } from "@/constants/permissions";

import { api } from "@/lib/api/client";

import { SKELETON_CARD_TEST_ID } from "@/components/shared/ListSkeleton";

import { useAuthStore } from "../auth-store";

import { PermissionBoundary } from "./PermissionBoundary";

import type { PermissionCode } from "../me-permissions";
import type { ReactNode } from "react";

const http = new MockAdapter(api);
const ALICE = {
  userId: "u-alice",
  username: "alice",
  email: "alice@stockflow.vn",
  fullName: "Alice",
  status: "ACTIVE",
  roles: [],
  lastLoginAt: null,
};
const PAGE = "Trang được bảo vệ";

const permissionsBody = (permissions: readonly string[]) => ({
  success: true,
  data: { roles: [], permissions, dataScope: "ALL" },
});

function grant(permissions: readonly string[]) {
  http.onGet(PERMISSION_QUERY.path).reply(200, permissionsBody(permissions));
}

/**
 * Holds the response back until the test releases it: RNTL 14 renders inside an async act, which
 * would otherwise let an instant reply land before the waiting state can be asserted.
 */
function hold() {
  let release: (permissions: readonly string[]) => void = () => undefined;
  http.onGet(PERMISSION_QUERY.path).reply(
    () =>
      new Promise((resolve) => {
        release = (permissions) => resolve([200, permissionsBody(permissions)]);
      }),
  );
  return (permissions: readonly string[]) => act(async () => release(permissions));
}

async function page(
  permissions: readonly PermissionCode[],
  options: { mode?: "all" | "any"; variant?: "list" | "detail" } = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <PermissionBoundary permissions={permissions} {...options}>
      <Text>{PAGE}</Text>
    </PermissionBoundary>,
    { wrapper },
  );
}

beforeEach(() => {
  http.reset();
  useAuthStore.getState().login(ALICE, Date.now() + 3_600_000);
});

describe("PermissionBoundary", () => {
  it("waits for permissions without rendering page content", async () => {
    const release = hold();
    await page([SUPPLIER_PERMISSIONS.viewPage]);

    expect(screen.getByLabelText(MOBILE_LABELS.loading)).toBeOnTheScreen();
    expect(screen.queryByText(PAGE)).toBeNull();

    await release([SUPPLIER_PERMISSIONS.viewPage]);
    expect(await screen.findByText(PAGE)).toBeOnTheScreen();
  });

  it("a list waits with card-shaped placeholders", async () => {
    hold();
    await page([SUPPLIER_PERMISSIONS.viewPage], { variant: "list" });
    expect(screen.getAllByTestId(SKELETON_CARD_TEST_ID).length).toBeGreaterThan(0);
  });

  it("a detail screen (the default) waits with section placeholders, not list cards", async () => {
    hold();
    await page([SUPPLIER_PERMISSIONS.viewPage]);
    expect(screen.getByLabelText(MOBILE_LABELS.loading)).toBeOnTheScreen();
    expect(screen.queryByTestId(SKELETON_CARD_TEST_ID)).toBeNull();
  });

  it("authenticated denial displays access denied and preserves the session", async () => {
    grant([SUPPLIER_PERMISSIONS.read]);
    await page([SUPPLIER_PERMISSIONS.viewPage, SUPPLIER_PERMISSIONS.read]);

    expect(await screen.findByText(PERMISSION_UI.deniedTitle)).toBeOnTheScreen();
    expect(screen.getByText(PERMISSION_UI.deniedDescription)).toBeOnTheScreen();
    expect(screen.queryByText(PAGE)).toBeNull();
    expect(screen.queryByRole("button", { name: MOBILE_LABELS.retry })).toBeNull();
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("an ordinary 403 displays denial instead of clearing auth", async () => {
    http.onGet(PERMISSION_QUERY.path).reply(403, { success: false, errorCode: "FORBIDDEN" });
    await page([SUPPLIER_PERMISSIONS.viewPage]);

    expect(await screen.findByText(PERMISSION_UI.deniedTitle)).toBeOnTheScreen();
    expect(screen.queryByText(UI_LABELS.loadError.permissionsTitle)).toBeNull();
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("another error shows the permissions error, and retry loads them again", async () => {
    http
      .onGet(PERMISSION_QUERY.path)
      .replyOnce(503, { success: false, errorCode: "AUTHORIZATION_UNAVAILABLE" });
    grant([SUPPLIER_PERMISSIONS.viewPage]);
    await page([SUPPLIER_PERMISSIONS.viewPage]);
    const user = userEvent.setup();

    expect(await screen.findByText(UI_LABELS.loadError.permissionsTitle)).toBeOnTheScreen();
    expect(screen.queryByText(PERMISSION_UI.deniedTitle)).toBeNull();

    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.retry }));

    expect(await screen.findByText(PAGE)).toBeOnTheScreen();
  });

  it("mode any opens with one of the codes (mode all, the default, is the denial case above)", async () => {
    grant([SUPPLIER_PERMISSIONS.read]);
    await page([SUPPLIER_PERMISSIONS.viewPage, SUPPLIER_PERMISSIONS.read], { mode: "any" });
    expect(await screen.findByText(PAGE)).toBeOnTheScreen();
  });

  it("unknown auth shows the skeleton and does not fetch", async () => {
    useAuthStore.setState({ status: "unknown" });
    await page([SUPPLIER_PERMISSIONS.viewPage]);

    expect(screen.getByLabelText(MOBILE_LABELS.loading)).toBeOnTheScreen();
    expect(screen.queryByText(PAGE)).toBeNull();
    expect(http.history.get).toHaveLength(0);
  });
});
