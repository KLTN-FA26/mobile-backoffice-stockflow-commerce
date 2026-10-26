/**
 * Tabs, hubs and route stubs under the real `app/` tree. The backend is the only stand-in: auth-api
 * for the session, and `GET /identity/me/permissions` at the HTTP layer for the permission sets, so
 * the permission query, its parsing and its error mapping all run for real.
 */
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook, screen, userEvent, waitFor } from "@testing-library/react-native";
import MockAdapter from "axios-mock-adapter";
import { router } from "expo-router";
import { BottomTabBarHeightContext } from "expo-router/js-tabs";
import { getMockContext, renderRouter } from "expo-router/testing-library";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { UI_LABELS } from "@/constants";
import { INVENTORY_LABELS } from "@/constants/inventory";
import { MOBILE_LABELS, MOBILE_ROUTES } from "@/constants/mobile";
import { PERMISSION_QUERY, PERMISSION_UI } from "@/constants/permissions";

import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { fetchMe } from "@/lib/auth/auth-api";
import { useAuthStore } from "@/lib/auth/auth-store";
import { persistSession } from "@/lib/auth/token-store";

import { BOTTOM_ACTION_BAR_TEST_ID, BottomActionBar } from "../BottomActionBar";
import { RouteErrorBoundary } from "../RouteErrorBoundary";
import { ScreenHeader } from "../ScreenHeader";
import { NAV_GROUPS } from "../nav-config";
import { canSeeNavItem, useNavVisibility } from "../use-nav-visibility";

import type { AuthUser } from "@/lib/auth/auth-store";
import type { PermissionCode } from "@/lib/auth/me-permissions";
import type { ReactNode } from "react";

jest.mock("@/lib/config", () => ({
  APP_CONFIG: { ok: true, apiUrl: "https://api.test/api/v1" },
}));
jest.mock("@/lib/auth/auth-api", () => ({
  loginRequest: jest.fn(),
  fetchMe: jest.fn(),
  logoutRequest: jest.fn(),
}));

const me = jest.mocked(fetchMe);
const http = new MockAdapter(api);

const APP_DIR = "./app";
const HOUR_MS = 3_600_000;
/** Loading (and, on a cold Jest cache, transforming) every route module and the navigators. */
const PRELOAD_TIMEOUT_MS = 120_000;
/** The permission query retries a 5xx twice (1 s, then 2 s) before it reports the error. */
const PERMISSION_RETRIES_MS = 5_000;
const ALICE: AuthUser = {
  userId: "u-alice",
  username: "alice",
  email: "alice@stockflow.vn",
  fullName: "Alice Nguyễn",
  status: "ACTIVE",
  roles: [],
  lastLoginAt: null,
};

// BE seed codes, written out (web `mock-user-grants.ts`): a nav item reading the wrong constant
// fails here instead of agreeing with itself.
const WAREHOUSE_STAFF = [
  "procurement-goods-receipts:VIEW_PAGE",
  "fulfillment-pick-lists:VIEW_PAGE",
  "fulfillment-packages:VIEW_PAGE",
  "fulfillment-picking:READ",
  "fulfillment-shipments:VIEW_PAGE",
  "inventory-stock-items:READ",
  "inventory-stock-items:UPDATE",
];
const ORDER_COORDINATOR = [...WAREHOUSE_STAFF, "sales-orders:VIEW_PAGE"];
const NO_FULFILLMENT = ["procurement-goods-receipts:VIEW_PAGE", "inventory-stock-items:READ"];
const EVERY_NAV_CODE = NAV_GROUPS.flatMap(({ items }) =>
  items.flatMap((item) => [
    ...(item.permission ? [item.permission] : []),
    ...(item.anyPermission ?? []),
  ]),
);

const permissionsBody = (permissions: readonly string[]) => ({
  success: true,
  data: { roles: [], permissions, dataScope: "WAREHOUSE" },
});

function grant(permissions: readonly string[]) {
  http.onGet(PERMISSION_QUERY.path).reply(200, permissionsBody(permissions));
}

function authorizationUnavailable() {
  http.onGet(PERMISSION_QUERY.path).reply(503, {
    success: false,
    errorCode: "AUTHORIZATION_UNAVAILABLE",
    message: "Authorization unavailable",
  });
}

/** Holds the permissions response back until the test releases it with `permissions`. */
function holdPermissions() {
  let release: (permissions: readonly string[]) => void = () => undefined;
  http.onGet(PERMISSION_QUERY.path).reply(
    () =>
      new Promise((resolve) => {
        release = (permissions) => resolve([200, permissionsBody(permissions)]);
      }),
  );
  return (permissions: readonly string[]) => release(permissions);
}

async function openApp(initialUrl: string = MOBILE_ROUTES.start) {
  const app = await renderRouter(APP_DIR, { initialUrl });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  return { app, user };
}

async function openSignedIn(initialUrl: string = MOBILE_ROUTES.start) {
  await persistSession({ accessToken: "tok-stored", expiresAt: Date.now() + 8 * HOUR_MS });
  return openApp(initialUrl);
}

const tabButton = (label: string) => screen.queryByRole("button", { name: label });
const hubHeader = (title: string) => screen.findByRole("header", { name: title });

// Expo Router requires the route modules lazily, during the first render. Load them up front so
// that cost does not count against the first test's timeout.
beforeAll(() => {
  const routes = getMockContext(APP_DIR);
  for (const key of routes.keys()) routes(key);
}, PRELOAD_TIMEOUT_MS);

beforeEach(() => {
  http.reset();
  me.mockReset().mockResolvedValue(ALICE);
});

afterEach(() => {
  jest.useRealTimers();
  focusManager.setFocused(undefined);
});

describe("start route", () => {
  it("signed-out start redirects to login", async () => {
    const { app } = await openApp();

    expect(await screen.findByLabelText(MOBILE_LABELS.login.username)).toBeOnTheScreen();
    expect(app.getPathname()).toBe(MOBILE_ROUTES.login);
    expect(http.history.get).toHaveLength(0);
  });

  it("start waits for permissions then opens the first visible hub", async () => {
    const release = holdPermissions();
    const { app } = await openSignedIn();

    expect(await screen.findByLabelText(MOBILE_LABELS.loading)).toBeOnTheScreen();
    expect(app.getPathname()).toBe(MOBILE_ROUTES.start);

    await act(async () => release(WAREHOUSE_STAFF));

    expect(await hubHeader(MOBILE_LABELS.tabs.inbound)).toBeOnTheScreen();
    expect(app.getPathname()).toBe(MOBILE_ROUTES.hubs.inbound);
  });
});

describe("tabs and hubs by permission", () => {
  it("warehouse staff sees receipts but no orders", async () => {
    grant(WAREHOUSE_STAFF);
    const { app, user } = await openSignedIn();

    expect(await screen.findByText(UI_LABELS.receipt.pageTitle)).toBeOnTheScreen();
    expect(app.getPathname()).toBe(MOBILE_ROUTES.hubs.inbound);

    const fulfillmentTab = tabButton(MOBILE_LABELS.tabs.fulfillment);
    expect(fulfillmentTab).toBeOnTheScreen();
    if (fulfillmentTab) await user.press(fulfillmentTab);

    expect(await hubHeader(MOBILE_LABELS.tabs.fulfillment)).toBeOnTheScreen();
    expect(app.getPathname()).toBe(MOBILE_ROUTES.hubs.fulfillment);
    expect(screen.getByText(UI_LABELS.fulfillment.pickingTitle)).toBeOnTheScreen();
    expect(screen.getByText(UI_LABELS.fulfillment.packingTitle)).toBeOnTheScreen();
    expect(screen.queryByText(UI_LABELS.order.pageTitle)).toBeNull();
  });

  it("order coordinator sees orders", async () => {
    grant(ORDER_COORDINATOR);
    await openSignedIn(MOBILE_ROUTES.hubs.fulfillment);

    expect(await screen.findByText(UI_LABELS.order.pageTitle)).toBeOnTheScreen();
    expect(screen.getByText(UI_LABELS.fulfillment.pickingTitle)).toBeOnTheScreen();
  });

  it("user without any fulfillment code hides the fulfillment tab", async () => {
    grant(NO_FULFILLMENT);
    const { app } = await openSignedIn();

    expect(await hubHeader(MOBILE_LABELS.tabs.inbound)).toBeOnTheScreen();
    expect(app.getPathname()).toBe(MOBILE_ROUTES.hubs.inbound);
    expect(tabButton(MOBILE_LABELS.tabs.inbound)).toBeOnTheScreen();
    expect(tabButton(MOBILE_LABELS.tabs.warehouse)).toBeOnTheScreen();
    expect(tabButton(MOBILE_LABELS.tabs.account)).toBeOnTheScreen();
    expect(tabButton(MOBILE_LABELS.tabs.fulfillment)).toBeNull();
  });

  it("inventory overview visible with reservation read only", async () => {
    grant(["inventory-reservations:READ"]);
    await openSignedIn(MOBILE_ROUTES.hubs.warehouse);

    expect(await screen.findByText(INVENTORY_LABELS.overviewTitle)).toBeOnTheScreen();
    // Codes this user lacks hide their items; items without a code stay.
    expect(screen.queryByText(UI_LABELS.transfer.pageTitle)).toBeNull();
    expect(screen.getByText(MOBILE_LABELS.nav.warehouseMap)).toBeOnTheScreen();
  });

  it("coming soon items show tag", async () => {
    grant(WAREHOUSE_STAFF);
    await openSignedIn(MOBILE_ROUTES.hubs.inbound);

    const putaway = await screen.findByRole("button", {
      name: new RegExp(`^${MOBILE_LABELS.nav.putaway}`),
    });
    const receipts = screen.getByRole("button", {
      name: new RegExp(`^${UI_LABELS.receipt.pageTitle}`),
    });
    expect(putaway).toHaveTextContent(MOBILE_LABELS.comingSoonTag, { exact: false });
    expect(receipts).not.toHaveTextContent(MOBILE_LABELS.comingSoonTag, { exact: false });
    expect(screen.getAllByText(MOBILE_LABELS.comingSoonTag)).toHaveLength(1);
  });

  it("hub shows permissions error with retry", async () => {
    authorizationUnavailable();
    const { user } = await openSignedIn(MOBILE_ROUTES.hubs.inbound);

    expect(
      await screen.findByText(
        UI_LABELS.loadError.permissionsTitle,
        {},
        { timeout: PERMISSION_RETRIES_MS },
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(PERMISSION_UI.deniedTitle)).toBeNull();
    // Not knowing the permissions hides no tab.
    expect(tabButton(MOBILE_LABELS.tabs.fulfillment)).toBeOnTheScreen();

    grant(WAREHOUSE_STAFF);
    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.retry }));

    expect(await screen.findByText(UI_LABELS.receipt.pageTitle)).toBeOnTheScreen();
    expect(screen.queryByText(UI_LABELS.loadError.permissionsTitle)).toBeNull();
  });

  it("failed permissions refetch keeps the last known nav", async () => {
    grant(NO_FULFILLMENT);
    const { app } = await openSignedIn(MOBILE_ROUTES.hubs.inbound);
    expect(await screen.findByText(UI_LABELS.receipt.pageTitle)).toBeOnTheScreen();
    expect(tabButton(MOBILE_LABELS.tabs.fulfillment)).toBeNull();
    const loads = http.history.get.length;

    // Back in the foreground the grants are asked for again ("always"), and this time the
    // server cannot answer: the refetch and its two retries fail.
    authorizationUnavailable();
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await act(() => jest.advanceTimersByTimeAsync(PERMISSION_RETRIES_MS));
    expect(http.history.get.length - loads).toBe(3);

    // The last known grants still drive the nav: no error copy, no tab coming back.
    expect(screen.queryByText(UI_LABELS.loadError.permissionsTitle)).toBeNull();
    expect(screen.getByText(UI_LABELS.receipt.pageTitle)).toBeOnTheScreen();
    expect(tabButton(MOBILE_LABELS.tabs.fulfillment)).toBeNull();
    expect(app.getPathname()).toBe(MOBILE_ROUTES.hubs.inbound);
  });

  it("pending permissions keep all tabs", async () => {
    const release = holdPermissions();
    const { app } = await openSignedIn(MOBILE_ROUTES.hubs.fulfillment);

    expect(await hubHeader(MOBILE_LABELS.tabs.fulfillment)).toBeOnTheScreen();
    expect(screen.getByLabelText(MOBILE_LABELS.loading)).toBeOnTheScreen();
    for (const label of Object.values(MOBILE_LABELS.tabs)) {
      expect(tabButton(label)).toBeOnTheScreen();
    }

    // Once known, a tab with nothing left goes away, and its open hub moves to the first visible one.
    await act(async () => release(NO_FULFILLMENT));

    await waitFor(() => expect(app.getPathname()).toBe(MOBILE_ROUTES.hubs.inbound));
    expect(tabButton(MOBILE_LABELS.tabs.fulfillment)).toBeNull();
  });
});

describe("hub items and route stubs", () => {
  it("a hub item opens its screen, and back returns to the hub", async () => {
    grant(WAREHOUSE_STAFF);
    const { app, user } = await openSignedIn(MOBILE_ROUTES.hubs.inbound);

    await user.press(await screen.findByText(MOBILE_LABELS.nav.putaway));

    expect(app.getPathname()).toBe(MOBILE_ROUTES.putaway);
    expect(await screen.findByText(MOBILE_LABELS.comingSoonDescription)).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: MOBILE_LABELS.nav.putaway })).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: UI_LABELS.shell.navBack }));
    expect(app.getPathname()).toBe(MOBILE_ROUTES.hubs.inbound);

    await user.press(screen.getByText(UI_LABELS.receipt.pageTitle));

    expect(app.getPathname()).toBe(MOBILE_ROUTES.receipts.list);
    expect(await screen.findByText(MOBILE_LABELS.portPendingDescription)).toBeOnTheScreen();
  });

  it("every nav item has a route that shows its label", async () => {
    grant(EVERY_NAV_CODE);
    const { app } = await openSignedIn(MOBILE_ROUTES.hubs.inbound);
    expect(await hubHeader(MOBILE_LABELS.tabs.inbound)).toBeOnTheScreen();

    for (const item of NAV_GROUPS.flatMap((group) => group.items)) {
      await act(async () => router.navigate(item.href));
      expect(app.getPathname()).toBe(item.href);
      expect(await screen.findByRole("header", { name: item.label })).toBeOnTheScreen();
      expect(
        screen.getByText(
          item.comingSoon
            ? MOBILE_LABELS.comingSoonDescription
            : MOBILE_LABELS.portPendingDescription,
        ),
      ).toBeOnTheScreen();
    }
  });
});

describe("useNavVisibility", () => {
  /** One client per rendered hook, created once: a re-render must not start an empty cache. */
  function makeWrapper() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    };
  }

  beforeEach(() => {
    useAuthStore.getState().login(ALICE, Date.now() + HOUR_MS);
  });

  const groupKeys = (result: { current: ReturnType<typeof useNavVisibility> }) =>
    result.current.groups.map(({ group }) => group.key);

  it("drops a group with nothing left and starts at the first remaining hub", async () => {
    grant(NO_FULFILLMENT);
    const { result } = await renderHook(useNavVisibility, { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(groupKeys(result)).toEqual(["inbound", "warehouse"]);
    expect(result.current.firstVisibleHref).toBe(MOBILE_ROUTES.hubs.inbound);
  });

  it("keeps every group while the permissions are pending or failed", async () => {
    holdPermissions();
    const pending = await renderHook(useNavVisibility, { wrapper: makeWrapper() });
    expect(pending.result.current.status).toBe("pending");
    expect(groupKeys(pending.result)).toEqual(["inbound", "warehouse", "fulfillment"]);
    expect(pending.result.current.firstVisibleHref).toBe(MOBILE_ROUTES.hubs.inbound);

    authorizationUnavailable();
    const failed = await renderHook(useNavVisibility, { wrapper: makeWrapper() });
    await waitFor(() => expect(failed.result.current.status).toBe("error"));
    expect(groupKeys(failed.result)).toEqual(["inbound", "warehouse", "fulfillment"]);
  });

  it("canSeeNavItem: no code shows, a code needs it, anyPermission needs one of them", () => {
    const can = (codes: readonly string[]) => (code: PermissionCode) => codes.includes(code);
    const items = NAV_GROUPS.flatMap((group) => group.items);
    const byLabel = (label: string) => items.find((item) => item.label === label);
    const putaway = byLabel(MOBILE_LABELS.nav.putaway);
    const orders = byLabel(UI_LABELS.order.pageTitle);
    const overview = byLabel(INVENTORY_LABELS.overviewTitle);
    if (!putaway || !orders || !overview) throw new Error("nav items missing");

    expect(canSeeNavItem(putaway, can([]))).toBe(true);
    expect(canSeeNavItem(orders, can([]))).toBe(false);
    expect(canSeeNavItem(orders, can(["sales-orders:VIEW_PAGE"]))).toBe(true);
    expect(canSeeNavItem(overview, can(["inventory-stock-items:READ"]))).toBe(true);
    expect(canSeeNavItem(overview, can(["inventory-reservations:READ"]))).toBe(true);
    // Alert READ alone does not open the overview (web BackofficeShell rule).
    expect(canSeeNavItem(overview, can(["inventory-alerts:READ"]))).toBe(false);
  });
});

describe("screen parts", () => {
  const WINDOW_METRICS = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, right: 0, bottom: 34, left: 0 },
  };

  it("bottom action bar shows disabled reason inline", async () => {
    const onPrimary = jest.fn();
    const onSecondary = jest.fn();
    const onMore = jest.fn();
    const reason = "Còn kiện chưa lên xe";
    await render(
      <SafeAreaProvider initialMetrics={WINDOW_METRICS}>
        <BottomActionBar
          primary={{ label: "Xác nhận bàn giao", onPress: onPrimary, disabled: true }}
          secondary={[{ label: "Huỷ chuyến", onPress: onSecondary, variant: "danger" }]}
          disabledReason={reason}
          more={{ label: "Thao tác khác", onPress: onMore }}
        />
      </SafeAreaProvider>,
    );
    const user = userEvent.setup();

    const primary = screen.getByRole("button", { name: "Xác nhận bàn giao" });
    expect(primary).toBeDisabled();
    expect(primary).toHaveProp("accessibilityHint", reason);
    expect(screen.getByText(reason)).toBeOnTheScreen();

    await user.press(primary);
    await user.press(screen.getByRole("button", { name: "Huỷ chuyến" }));
    await user.press(screen.getByRole("button", { name: "Thao tác khác" }));
    expect(onPrimary).not.toHaveBeenCalled();
    expect(onSecondary).toHaveBeenCalledTimes(1);
    expect(onMore).toHaveBeenCalledTimes(1);
  });

  it("bottom action bar shows no reason when none is given", async () => {
    await render(<BottomActionBar primary={{ label: "Lưu", onPress: jest.fn() }} />);

    expect(screen.getByRole("button", { name: "Lưu" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Lưu" })).not.toHaveProp(
      "accessibilityHint",
      expect.anything(),
    );
  });

  it("bottom action bar takes the bottom inset only without a tab bar below it", async () => {
    const bar = (
      <SafeAreaProvider initialMetrics={WINDOW_METRICS}>
        <BottomActionBar primary={{ label: "Lưu", onPress: jest.fn() }} />
      </SafeAreaProvider>
    );
    // A pushed screen without a tab bar: the bar clears the home indicator itself (12 + 34).
    const { rerender } = await render(bar);
    expect(screen.getByTestId(BOTTOM_ACTION_BAR_TEST_ID)).toHaveStyle({ paddingBottom: 46 });

    // Above a visible tab bar, which already takes the inset: only the bar's own padding.
    await rerender(
      <BottomTabBarHeightContext.Provider value={94}>{bar}</BottomTabBarHeightContext.Provider>,
    );
    expect(screen.getByTestId(BOTTOM_ACTION_BAR_TEST_ID)).toHaveStyle({ paddingBottom: 12 });
  });

  it("bottom action bar keeps the caller's class on a secondary action", async () => {
    await render(
      <BottomActionBar
        secondary={[{ label: "Huỷ chuyến", onPress: jest.fn(), className: "min-w-[120px]" }]}
      />,
    );

    const className = String(screen.getByRole("button", { name: "Huỷ chuyến" }).props.className);
    expect(className).toContain("flex-1");
    expect(className).toContain("min-w-[120px]");
  });

  it("screen header shows the title and a back button only when it can go back", async () => {
    const onBack = jest.fn();
    const user = userEvent.setup();
    const { rerender } = await render(<ScreenHeader title="RCV-0001" titleMono onBack={onBack} />);

    expect(screen.getByRole("header", { name: "RCV-0001" })).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: UI_LABELS.shell.navBack }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<ScreenHeader title={MOBILE_LABELS.tabs.inbound} />);
    expect(screen.queryByRole("button", { name: UI_LABELS.shell.navBack })).toBeNull();
  });

  it("route error boundary renders retry", async () => {
    const retry = jest.fn(async () => undefined);
    const user = userEvent.setup();
    await render(
      <RouteErrorBoundary error={new ApiError(0, "NETWORK_ERROR", "x")} retry={retry} />,
    );

    expect(screen.getByText(UI_LABELS.loadError.networkTitle)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.retry }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
