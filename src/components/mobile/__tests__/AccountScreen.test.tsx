/**
 * The account tab: identity, default warehouse, theme, scan feedback switches, the scan check,
 * session and sign out. The backend is the only stand-in: `GET /warehouses` at the HTTP layer (so
 * the real query, its zod schema and its error mapping run) and auth-api for the best-effort logout
 * call; the scan check's camera is reached through the router's `push` (no navigator here).
 */
import { act, screen, userEvent, waitFor } from "@testing-library/react-native";
import MockAdapter from "axios-mock-adapter";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { AccessibilityInfo } from "react-native";

import { UI_LABELS } from "@/constants";
import { MOBILE_LABELS, MOBILE_ROUTES } from "@/constants/mobile";
import { WAREHOUSE_PERMISSIONS } from "@/constants/permissions";

import { api } from "@/lib/api/client";
import { logoutRequest } from "@/lib/auth/auth-api";
import { useAuthStore } from "@/lib/auth/auth-store";
import { meKeys } from "@/lib/auth/me-permissions";
import { setAccessToken } from "@/lib/auth/token-store";
import { useAppStore } from "@/lib/store/use-app-store";

import { notificationAsync } from "@/test/mocks/expo-haptics";
import { renderWithProviders } from "@/test/render";

import { AccountScreen } from "../AccountScreen";
import { publishScan } from "../scan/scan-bus";

import type { AuthUser } from "@/lib/auth/auth-store";
import type { QueryClient } from "@tanstack/react-query";

jest.mock("@/lib/config", () => ({
  APP_CONFIG: { ok: true, apiUrl: "https://api.test/api/v1" },
}));
jest.mock("@/lib/auth/auth-api", () => ({
  loginRequest: jest.fn(),
  fetchMe: jest.fn(),
  logoutRequest: jest.fn(),
}));

// A getter, so the version can change per test while the module mock stays hoisted. The holder
// is `undefined` until this line runs: expo-router (the scan field's camera button) reads the
// config while this file's imports load, before then.
let mockConstants: { expoConfig: { version?: string } | null } | undefined = {
  expoConfig: { version: "1.2.3" },
};
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockConstants?.expoConfig ?? null;
    },
  },
}));

const { account, scan } = MOBILE_LABELS;
const logout = jest.mocked(logoutRequest);
const http = new MockAdapter(api);

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const ALICE: AuthUser = {
  userId: "u-alice",
  username: "alice",
  email: "alice@stockflow.vn",
  fullName: "Alice Nguyễn",
  status: "ACTIVE",
  roles: ["WAREHOUSE_STAFF", "ORDER_COORDINATOR"],
  lastLoginAt: null,
};
const BOB: AuthUser = { ...ALICE, userId: "u-bob", username: "bob", fullName: "Bob Trần" };
const READ_WAREHOUSES = [WAREHOUSE_PERMISSIONS.read];
const HANOI = { id: "wh-hn", prefix: "HN", name: "Kho Hà Nội", status: "ACTIVE" };
const DANANG = { id: "wh-dn", prefix: "DN", name: "Kho Đà Nẵng", status: "ACTIVE" };
// What the active-warehouse query must send: a plain params object, as the brief spells it out.
const ACTIVE_PARAMS = { page: 0, size: 200, status: "ACTIVE", sort: "name,asc" };

const page = (items: readonly object[]) => ({ success: true, data: { items } });
const serveWarehouses = (items: readonly object[] = [HANOI, DANANG]) =>
  http.onGet("/warehouses").reply(200, page(items));
const warehouseRequests = () => http.history.get.filter(({ url }) => url === "/warehouses");

const warehouseRow = () =>
  screen.getByRole("button", { name: new RegExp(`^${account.defaultWarehouse}`) });
const radio = (name: string | RegExp) => screen.getByRole("radio", { name });

/** The row stays disabled while the list loads, so an enabled row means the options are in. */
async function loadedWarehouseRow() {
  await waitFor(() => expect(warehouseRow()).toBeEnabled());
  return warehouseRow();
}

/**
 * Another worker signs in on the same phone (a re-login that switches users). The permission grants
 * are seeded for the new session, as `renderWithProviders` does for the first one.
 */
async function signInAs(queryClient: QueryClient, who: AuthUser) {
  await act(async () => {
    useAuthStore.getState().login(who, Date.now() + HOUR_MS);
    queryClient.setQueryData(
      meKeys.sessionPermissions(who.userId, useAuthStore.getState().authorizationVersion),
      { roles: [], permissions: READ_WAREHOUSES, dataScope: "WAREHOUSE" },
    );
  });
}

beforeEach(() => {
  http.reset();
  logout.mockReset().mockResolvedValue(undefined);
  useAppStore.setState(useAppStore.getInitialState(), true);
  mockConstants = { expoConfig: { version: "1.2.3" } };
});

describe("identity", () => {
  it("shows user identity", async () => {
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: [] });

    expect(screen.getByRole("header", { name: account.title })).toBeOnTheScreen();
    expect(screen.getByText("Alice Nguyễn")).toBeOnTheScreen();
    expect(screen.getByText("alice")).toBeOnTheScreen();
    expect(screen.getByText("alice@stockflow.vn")).toBeOnTheScreen();
    expect(screen.getByText("WAREHOUSE_STAFF, ORDER_COORDINATOR")).toBeOnTheScreen();
  });

  it("uses the username as the name, once, when the account has no full name", async () => {
    await renderWithProviders(<AccountScreen />, {
      user: { ...ALICE, fullName: null, roles: [] },
      permissions: [],
    });

    expect(screen.getAllByText("alice")).toHaveLength(1);
    expect(screen.getByText("alice@stockflow.vn")).toBeOnTheScreen();
  });
});

describe("default warehouse", () => {
  it("hides default warehouse without warehouse read", async () => {
    serveWarehouses();
    await renderWithProviders(<AccountScreen />, {
      user: ALICE,
      permissions: ["inventory-stock-items:READ"],
    });

    expect(screen.queryByText(account.defaultWarehouse)).toBeNull();
    expect(screen.queryByRole("button", { name: new RegExp(account.defaultWarehouse) })).toBeNull();
    expect(screen.queryByText(account.defaultWarehouseHint)).toBeNull();
    expect(warehouseRequests()).toHaveLength(0);
  });

  it("shows the hint and a disabled row while the options load", async () => {
    http.onGet("/warehouses").reply(() => new Promise(() => undefined));
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: READ_WAREHOUSES });

    expect(screen.getByText(account.defaultWarehouseHint)).toBeOnTheScreen();
    expect(warehouseRow()).toBeDisabled();
  });

  it("warehouse options request uses object params", async () => {
    http.onGet("/warehouses", { params: ACTIVE_PARAMS }).reply(200, page([HANOI]));
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: READ_WAREHOUSES });

    // A request that did not match the params would 404 and leave the row in its error state.
    await loadedWarehouseRow();
    expect(warehouseRequests()).toHaveLength(1);
    expect(warehouseRequests()[0]?.params).toEqual(ACTIVE_PARAMS);
  });

  it("selecting warehouse stores default id", async () => {
    const user = userEvent.setup();
    serveWarehouses();
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: READ_WAREHOUSES });
    expect(await loadedWarehouseRow()).toHaveAccessibleName(
      `${account.defaultWarehouse}: ${account.noWarehouse}`,
    );

    await user.press(warehouseRow());
    expect(screen.getByRole("search")).toBeOnTheScreen();
    expect(radio(account.noWarehouse)).toBeChecked();
    await user.press(radio("DN · Kho Đà Nẵng"));

    // Stored under the signed-in user's id.
    expect(useAppStore.getState().defaultWarehouseByUser).toEqual({ [ALICE.userId]: "wh-dn" });
    expect(screen.queryByRole("radio", { name: "HN · Kho Hà Nội" })).toBeNull();
    expect(warehouseRow()).toHaveAccessibleName(`${account.defaultWarehouse}: DN · Kho Đà Nẵng`);
  });

  it("the sheet search finds a warehouse by name without marks", async () => {
    const user = userEvent.setup();
    serveWarehouses();
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: READ_WAREHOUSES });
    await loadedWarehouseRow();

    await user.press(warehouseRow());
    await user.type(screen.getByRole("search"), "da nang");

    expect(radio("DN · Kho Đà Nẵng")).toBeOnTheScreen();
    expect(screen.queryByRole("radio", { name: "HN · Kho Hà Nội" })).toBeNull();
  });

  it("choosing not set clears the default warehouse", async () => {
    const user = userEvent.setup();
    serveWarehouses();
    useAppStore.getState().setDefaultWarehouse(ALICE.userId, "wh-hn");
    useAppStore.getState().setDefaultWarehouse(BOB.userId, "wh-dn");
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: READ_WAREHOUSES });
    expect(await loadedWarehouseRow()).toHaveAccessibleName(
      `${account.defaultWarehouse}: HN · Kho Hà Nội`,
    );

    await user.press(warehouseRow());
    expect(radio("HN · Kho Hà Nội")).toBeChecked();
    await user.press(radio(account.noWarehouse));

    // Only Alice's entry goes.
    expect(useAppStore.getState().defaultWarehouseByUser).toEqual({ [BOB.userId]: "wh-dn" });
    expect(warehouseRow()).toHaveAccessibleName(
      `${account.defaultWarehouse}: ${account.noWarehouse}`,
    );
  });

  it("default warehouse shows not set when stored id is not in the active list", async () => {
    // A warehouse deactivated since it was chosen: not offered any more, and nothing clears it.
    serveWarehouses();
    useAppStore.getState().setDefaultWarehouse(ALICE.userId, "wh-gone");
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: READ_WAREHOUSES });

    expect(await loadedWarehouseRow()).toHaveAccessibleName(
      `${account.defaultWarehouse}: ${account.noWarehouse}`,
    );
    expect(useAppStore.getState().defaultWarehouseByUser).toEqual({ [ALICE.userId]: "wh-gone" });
  });

  it("default warehouse is kept per user", async () => {
    const user = userEvent.setup();
    serveWarehouses();
    const { queryClient } = await renderWithProviders(<AccountScreen />, {
      user: ALICE,
      permissions: READ_WAREHOUSES,
    });
    const notSet = `${account.defaultWarehouse}: ${account.noWarehouse}`;
    expect(await loadedWarehouseRow()).toHaveAccessibleName(notSet);
    await user.press(warehouseRow());
    await user.press(radio("DN · Kho Đà Nẵng"));
    expect(warehouseRow()).toHaveAccessibleName(`${account.defaultWarehouse}: DN · Kho Đà Nẵng`);

    // Bob signs in on the same phone: Alice's warehouse is not his.
    await signInAs(queryClient, BOB);
    expect(await loadedWarehouseRow()).toHaveAccessibleName(notSet);
    await user.press(warehouseRow());
    expect(radio(account.noWarehouse)).toBeChecked();
    await user.press(radio("HN · Kho Hà Nội"));
    expect(warehouseRow()).toHaveAccessibleName(`${account.defaultWarehouse}: HN · Kho Hà Nội`);
    expect(useAppStore.getState().defaultWarehouseByUser).toEqual({
      [ALICE.userId]: "wh-dn",
      [BOB.userId]: "wh-hn",
    });

    // And Alice, back again, still has hers.
    await signInAs(queryClient, ALICE);
    expect(await loadedWarehouseRow()).toHaveAccessibleName(
      `${account.defaultWarehouse}: DN · Kho Đà Nẵng`,
    );
  });

  it("warehouse options error shows a retry", async () => {
    const user = userEvent.setup();
    http.onGet("/warehouses").replyOnce(500, { success: false, message: "boom" });
    serveWarehouses();
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: READ_WAREHOUSES });

    expect(await screen.findByText(UI_LABELS.loadError.serverTitle)).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: new RegExp(`^${account.defaultWarehouse}`) }),
    ).toBeNull();

    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.retry }));

    expect(await loadedWarehouseRow()).toHaveAccessibleName(
      `${account.defaultWarehouse}: ${account.noWarehouse}`,
    );
    expect(screen.queryByText(UI_LABELS.loadError.serverTitle)).toBeNull();
    expect(warehouseRequests()).toHaveLength(2);
  });
});

describe("theme", () => {
  it("theme radio updates store", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: [] });
    // The group is not an accessible element itself (it only names its radios), so no role query.
    expect(screen.getByLabelText(account.theme)).toHaveProp("accessibilityRole", "radiogroup");
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(radio(account.themeSystem)).toBeChecked();

    await user.press(radio(account.themeDark));

    expect(useAppStore.getState().theme).toBe("dark");
    expect(radio(account.themeDark)).toBeChecked();

    await user.press(radio(account.themeLight));
    expect(useAppStore.getState().theme).toBe("light");

    await user.press(radio(account.themeSystem));
    expect(useAppStore.getState().theme).toBe("system");
  });
});

describe("scan feedback", () => {
  it("sound switch toggles muted", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: [] });
    // The switch says "sound on", the store says "muted": the opposite of each other.
    expect(screen.getByRole("switch", { name: account.sound })).toBeChecked();
    expect(useAppStore.getState().muted).toBe(false);

    await user.press(screen.getByRole("switch", { name: account.sound }));

    expect(useAppStore.getState().muted).toBe(true);
    expect(screen.getByRole("switch", { name: account.sound })).not.toBeChecked();

    await user.press(screen.getByRole("switch", { name: account.sound }));
    expect(useAppStore.getState().muted).toBe(false);
  });

  it("sound switch starts off when the app is already muted", async () => {
    useAppStore.getState().setMuted(true);
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: [] });

    expect(screen.getByRole("switch", { name: account.sound })).not.toBeChecked();
  });

  it("haptics switch toggles haptics", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: [] });
    expect(screen.getByRole("switch", { name: account.haptics })).toBeChecked();

    await user.press(screen.getByRole("switch", { name: account.haptics }));

    expect(useAppStore.getState().hapticsEnabled).toBe(false);
    expect(screen.getByRole("switch", { name: account.haptics })).not.toBeChecked();
    // The other switch is untouched.
    expect(useAppStore.getState().muted).toBe(false);
  });
});

describe("scan check", () => {
  it("account scan check shows last code", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: [] });
    expect(screen.getByText(scan.testHint)).toBeOnTheScreen();
    expect(screen.queryByText(new RegExp(`^${scan.lastCode}`))).toBeNull();

    await user.type(screen.getByLabelText(scan.testTitle), "PKG-001", { submitEditing: true });

    expect(screen.getByText(`${scan.lastCode}: PKG-001`)).toBeOnTheScreen();
    expect(screen.getByLabelText(scan.testTitle)).toHaveDisplayValue("");
    // The scan feedback runs as at a station: vibration (on by default) and the code read out.
    expect(notificationAsync).toHaveBeenCalledWith("success");
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith("PKG-001");
  });

  it("the scan check reads one code with the camera", async () => {
    const push = jest.spyOn(router, "push").mockImplementation(() => undefined);
    const user = userEvent.setup();
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: [] });

    await user.press(screen.getByRole("button", { name: scan.openCamera }));

    expect(push).toHaveBeenCalledWith({
      pathname: MOBILE_ROUTES.scanner,
      params: { requestId: expect.any(String), mode: "single", title: scan.testTitle },
    });
    const [href] = push.mock.calls[0] ?? [];
    const requestId =
      typeof href === "object" && href !== null && "params" in href
        ? String((href.params as { requestId: string }).requestId)
        : "";
    await act(async () => publishScan(requestId, "QR-42"));

    expect(screen.getByText(`${scan.lastCode}: QR-42`)).toBeOnTheScreen();
    push.mockRestore();
  });
});

describe("session and version", () => {
  it.each([
    { left: 2 * HOUR_MS + 5 * MINUTE_MS + 30_000, hours: 2, minutes: 5 },
    // Whole minutes, floored: never "1 minute more" than the token has.
    { left: 7 * HOUR_MS + 59 * MINUTE_MS + 59_000, hours: 7, minutes: 59 },
    { left: 45_000, hours: 0, minutes: 0 },
  ])("session remaining shows hours and minutes ($hours h $minutes m)", async (at) => {
    useAuthStore.getState().login(ALICE, Date.now() + at.left);
    await renderWithProviders(<AccountScreen />);

    expect(screen.getByText(account.sessionRemaining(at.hours, at.minutes))).toBeOnTheScreen();
  });

  it("an already expired session shows no time left, never a negative one", async () => {
    useAuthStore.getState().login(ALICE, Date.now() - 5 * MINUTE_MS);
    await renderWithProviders(<AccountScreen />);

    expect(screen.getByText(account.sessionRemaining(0, 0))).toBeOnTheScreen();
    expect(screen.queryByText(/-\d/)).toBeNull();
  });

  it("no known expiry hides the time left and keeps the version", async () => {
    // A background /me check can discover a session whose expiry the app was never told.
    useAuthStore.getState().reconcileSession(ALICE);
    expect(useAuthStore.getState().sessionExpiresAt).toBeNull();
    await renderWithProviders(<AccountScreen />);

    // Any "<n> giờ <m> phút" line: the sentence itself is the label's business, not this test's.
    expect(screen.queryByText(/\d+ giờ \d+ phút/)).toBeNull();
    expect(screen.getByText(account.version)).toBeOnTheScreen();
    expect(screen.getByText("1.2.3")).toBeOnTheScreen();
  });

  it("shows the app version", async () => {
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: [] });

    expect(screen.getByText(account.version)).toBeOnTheScreen();
    expect(screen.getByText("1.2.3")).toBeOnTheScreen();
  });

  it("shows a dash when the app version is unknown", async () => {
    mockConstants = { expoConfig: null };
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: [] });

    expect(screen.getByText(account.versionUnknown)).toBeOnTheScreen();
  });
});

describe("sign out", () => {
  // The screen's own button and the sheet's confirm button carry the same name; the sheet comes
  // after the button in the tree.
  const signOutButtons = () => screen.getAllByRole("button", { name: account.signOut });

  it("sign out asks for confirmation then signs out", async () => {
    const user = userEvent.setup();
    setAccessToken("tok-alice");
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: [] });
    expect(screen.queryByText(account.signOutConfirm)).toBeNull();

    await user.press(signOutButtons()[0]);

    expect(screen.getByText(account.signOutConfirm)).toBeOnTheScreen();
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(logout).not.toHaveBeenCalled();

    expect(signOutButtons()).toHaveLength(2);
    await user.press(signOutButtons()[1]);

    await waitFor(() => expect(useAuthStore.getState().status).toBe("unauthenticated"));
    expect(useAuthStore.getState().user).toBeNull();
    expect(logout).toHaveBeenCalledWith("tok-alice");
  });

  it("the confirm shows its loading state and the sheet stays open until the sign-out is done", async () => {
    const user = userEvent.setup();
    // The local part of the sign-out ends with wiping the stored token: hold that back.
    let finishWipe: () => void = () => undefined;
    const wipe = jest.spyOn(SecureStore, "deleteItemAsync").mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishWipe = resolve;
        }),
    );
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: [] });
    await user.press(signOutButtons()[0]);
    await user.press(signOutButtons()[1]);

    try {
      // In flight: the confirm spins, nothing can be pressed twice or swiped away, the session is
      // still there, and the sheet has not closed itself on confirm.
      expect(wipe).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: MOBILE_LABELS.processing })).toBeBusy();
      expect(screen.getByRole("button", { name: MOBILE_LABELS.processing })).toBeDisabled();
      expect(screen.getByRole("button", { name: MOBILE_LABELS.cancel })).toBeDisabled();
      expect(screen.getByText(account.signOutConfirm)).toBeOnTheScreen();
      expect(useAuthStore.getState().status).toBe("authenticated");

      await user.press(screen.getByRole("button", { name: MOBILE_LABELS.processing }));
      expect(wipe).toHaveBeenCalledTimes(1);
      await act(async () => finishWipe());
      await waitFor(() => expect(useAuthStore.getState().status).toBe("unauthenticated"));
    } finally {
      // Even when an assertion above failed: no held-back wipe, no spy left for the next test.
      finishWipe();
      wipe.mockRestore();
    }
  });

  it("cancelling the confirmation keeps the session", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<AccountScreen />, { user: ALICE, permissions: [] });
    await user.press(signOutButtons()[0]);

    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.cancel }));

    expect(screen.queryByText(account.signOutConfirm)).toBeNull();
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(logout).not.toHaveBeenCalled();
  });
});
