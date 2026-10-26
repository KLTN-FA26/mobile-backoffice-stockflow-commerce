/**
 * The real `app/` routes under Expo Router: which screen each session state may open. The backend
 * is the only stand-in (auth-api); the session code, the gates and the protected routes are real.
 */
import { act, screen, userEvent, waitFor } from "@testing-library/react-native";
import MockAdapter from "axios-mock-adapter";
import { router } from "expo-router";
import { getMockContext, renderRouter } from "expo-router/testing-library";
import { useState } from "react";
import { TextInput } from "react-native";

import {
  INTL_PROBE_LABELS,
  MOBILE_LABELS,
  MOBILE_ROUTES,
  MOBILE_STORAGE_KEYS,
} from "@/constants/mobile";
import { PERMISSION_QUERY } from "@/constants/permissions";

import { api } from "@/lib/api/client";
import { fetchMe, loginRequest, logoutRequest } from "@/lib/auth/auth-api";
import { useAuthStore } from "@/lib/auth/auth-store";
import { persistSession } from "@/lib/auth/token-store";
import { kv } from "@/lib/platform/storage";

import type { AuthUser } from "@/lib/auth/auth-store";

jest.mock("@/lib/config", () => ({
  APP_CONFIG: { ok: true, apiUrl: "https://api.test/api/v1" },
}));
jest.mock("@/lib/auth/auth-api", () => ({
  loginRequest: jest.fn(),
  fetchMe: jest.fn(),
  logoutRequest: jest.fn(),
}));

const login = jest.mocked(loginRequest);
const me = jest.mocked(fetchMe);
const logout = jest.mocked(logoutRequest);
const http = new MockAdapter(api);

const APP_DIR = "./app";
const MINUTE_MS = 60_000;
/** Loading (and, on a cold Jest cache, transforming) every route module and the navigators. */
const PRELOAD_TIMEOUT_MS = 120_000;
const ALICE: AuthUser = {
  userId: "u-alice",
  username: "alice",
  email: "alice@stockflow.vn",
  fullName: "Alice Nguyễn",
  status: "ACTIVE",
  roles: [],
  lastLoginAt: null,
};
const BOB: AuthUser = { ...ALICE, userId: "u-bob", username: "bob", fullName: "Bob Trần" };

/** A screen of the signed-in area with unsaved work, labelled so the test can find it. */
function DraftScreen({ label }: { label: string }) {
  const [draft, setDraft] = useState("");
  return <TextInput accessibilityLabel={label} value={draft} onChangeText={setDraft} />;
}

// Two levels pushed inside (app), standing in for a list and a detail screen of a later task.
const LIST_ROUTE = "/test/receipts";
const DETAIL_ROUTE = "/test/receipt";
const LIST_LABEL = "Danh sách của Alice";
const DETAIL_LABEL = "Chi tiết của Alice";
const SIGNED_IN_TEST_ROUTES = {
  "(app)/test/receipts": () => <DraftScreen label={LIST_LABEL} />,
  "(app)/test/receipt": () => <DraftScreen label={DETAIL_LABEL} />,
};

async function openApp(initialUrl: string = MOBILE_ROUTES.start) {
  const app = await renderRouter(APP_DIR, { initialUrl });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  return { app, user };
}

/** Signed in as Alice with a list and a detail screen pushed, the detail holding a draft. */
async function openTwoLevelsDeep() {
  await storedSession(8 * 60 * MINUTE_MS);
  const app = await renderRouter(
    { appDir: APP_DIR, overrides: SIGNED_IN_TEST_ROUTES },
    { initialUrl: MOBILE_ROUTES.hubs.account },
  );
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  expect(await screen.findByText("Alice Nguyễn")).toBeOnTheScreen();
  await act(async () => router.push(LIST_ROUTE));
  await act(async () => router.push(DETAIL_ROUTE));
  await user.type(screen.getByLabelText(DETAIL_LABEL), "draft");
  expect(app.getPathname()).toBe(DETAIL_ROUTE);
  return { app, user };
}

async function reloginAs(user: ReturnType<typeof userEvent.setup>, who: AuthUser) {
  me.mockResolvedValue(who);
  await act(async () => useAuthStore.getState().markSessionExpired());
  await user.type(screen.getByLabelText(MOBILE_LABELS.login.username), who.username);
  await user.type(screen.getByLabelText(MOBILE_LABELS.login.password), "s3cret");
  await user.press(screen.getByRole("button", { name: MOBILE_LABELS.login.submit }));
}

const firstHubHeader = () => screen.findByRole("header", { name: MOBILE_LABELS.tabs.inbound });
const accountTab = () => screen.getByRole("button", { name: MOBILE_LABELS.tabs.account });

/** A session a previous run left: the token in SecureStore and its owner in the kv-store. */
async function storedSession(expiresInMs: number) {
  await persistSession({ accessToken: "tok-stored", expiresAt: Date.now() + expiresInMs });
  kv.set(MOBILE_STORAGE_KEYS.sessionOwner, ALICE.userId);
}

// Expo Router requires the route modules lazily, during the first render. Load them up front so
// that cost does not count against the first test's timeout.
beforeAll(() => {
  const routes = getMockContext(APP_DIR);
  for (const key of routes.keys()) routes(key);
}, PRELOAD_TIMEOUT_MS);

beforeEach(() => {
  login.mockReset().mockResolvedValue({
    accessToken: "tok-new",
    tokenType: "Bearer",
    expiresInSeconds: 28_800,
  });
  me.mockReset().mockResolvedValue(ALICE);
  logout.mockReset().mockResolvedValue(undefined);
  // A user holding no permission code: the start route still opens the inbound hub, whose
  // coming-soon items need none (the navigation tests cover the permission sets).
  http.reset();
  http
    .onGet(PERMISSION_QUERY.path)
    .reply(200, { success: true, data: { roles: [], permissions: [], dataScope: "OWN" } });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("app shell", () => {
  it("opens on the login screen when signed out", async () => {
    const { app } = await openApp();

    expect(await screen.findByLabelText(MOBILE_LABELS.login.username)).toBeOnTheScreen();
    expect(app.getPathname()).toBe(MOBILE_ROUTES.login);
    expect(screen.getByText(MOBILE_LABELS.appName)).toBeOnTheScreen();
  });

  it("sends a deep link into the app to the login screen when signed out", async () => {
    const { app } = await openApp(MOBILE_ROUTES.hubs.account);

    await waitFor(() => expect(app.getPathname()).toBe(MOBILE_ROUTES.login));
    expect(screen.queryByText(ALICE.fullName ?? "")).toBeNull();
  });

  it("signing in opens the first visible hub", async () => {
    const { app, user } = await openApp();
    await user.type(await screen.findByLabelText(MOBILE_LABELS.login.username), " alice ");
    await user.type(screen.getByLabelText(MOBILE_LABELS.login.password), "s3cret");

    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.login.submit }));

    expect(await firstHubHeader()).toBeOnTheScreen();
    expect(app.getPathname()).toBe(MOBILE_ROUTES.hubs.inbound);
    expect(login).toHaveBeenCalledWith({ username: "alice", password: "s3cret" });
    expect(screen.queryByLabelText(MOBILE_LABELS.login.username)).toBeNull();
  });

  it("a stored session opens the first hub, and signing out from the account tab returns to login", async () => {
    await storedSession(8 * 60 * MINUTE_MS);
    const { app, user } = await openApp();

    expect(await firstHubHeader()).toBeOnTheScreen();
    expect(app.getPathname()).toBe(MOBILE_ROUTES.hubs.inbound);

    await user.press(accountTab());
    expect(await screen.findByText("Alice Nguyễn")).toBeOnTheScreen();
    expect(app.getPathname()).toBe(MOBILE_ROUTES.hubs.account);

    // Signing out asks first: the button opens the confirmation, whose own button of the same
    // name does it (the screen behind the open sheet, its button included, is hidden from screen
    // readers, so the confirmation's is the one found).
    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.account.signOut }));
    expect(screen.getByText(MOBILE_LABELS.account.signOutConfirm)).toBeOnTheScreen();
    expect(app.getPathname()).toBe(MOBILE_ROUTES.hubs.account);
    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.account.signOut }));

    expect(await screen.findByLabelText(MOBILE_LABELS.login.username)).toBeOnTheScreen();
    expect(app.getPathname()).toBe(MOBILE_ROUTES.login);
  });

  it("keeps the dev Intl probe reachable while signed out", async () => {
    const { app } = await openApp("/dev-intl-probe");

    expect(await screen.findByText(INTL_PROBE_LABELS.title)).toBeOnTheScreen();
    expect(app.getPathname()).toBe("/dev-intl-probe");
  });

  it("an expired session keeps the screen under the re-login sheet", async () => {
    await storedSession(8 * 60 * MINUTE_MS);
    await openApp(MOBILE_ROUTES.hubs.account);
    expect(await screen.findByText("Alice Nguyễn")).toBeOnTheScreen();

    await act(async () => useAuthStore.getState().markSessionExpired());

    expect(screen.getByText(MOBILE_LABELS.relogin.title)).toBeOnTheScreen();
    // Still mounted under the sheet (hidden from screen readers while it is open).
    expect(screen.getByText("Alice Nguyễn", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it("the expiry banner opens the re-login sheet before the session runs out", async () => {
    await storedSession(10 * MINUTE_MS);
    const { user } = await openApp(MOBILE_ROUTES.hubs.account);

    const relogin = await screen.findByRole("button", { name: MOBILE_LABELS.sessionExpiry.action });
    expect(screen.queryByText(MOBILE_LABELS.relogin.description)).toBeNull();

    await user.press(relogin);

    expect(screen.getByText(MOBILE_LABELS.relogin.description)).toBeOnTheScreen();
    // Still mounted under the sheet (hidden from screen readers while it is open).
    expect(screen.getByText("Alice Nguyễn", { includeHiddenElements: true })).toBeOnTheScreen();
  });
});

describe("re-login over the signed-in screens", () => {
  it("relogin as another user navigates to first hub", async () => {
    const { app, user } = await openTwoLevelsDeep();

    await reloginAs(user, BOB);

    expect(await firstHubHeader()).toBeOnTheScreen();
    expect(app.getPathname()).toBe(MOBILE_ROUTES.hubs.inbound);
    // Nothing of Alice's is left: her screens are unmounted (hidden ones included, as a screen
    // covered by another is hidden from accessibility), and Back cannot reach them.
    const anywhere = { includeHiddenElements: true };
    expect(screen.queryByLabelText(LIST_LABEL, anywhere)).toBeNull();
    expect(screen.queryByLabelText(DETAIL_LABEL, anywhere)).toBeNull();
    expect(screen.queryByText("Alice Nguyễn", anywhere)).toBeNull();
    expect(router.canGoBack()).toBe(false);
    expect(screen.queryByText(MOBILE_LABELS.relogin.title)).toBeNull();

    await user.press(accountTab());
    expect(await screen.findByText("Bob Trần")).toBeOnTheScreen();
  });

  it("same-user re-login keeps the current screen", async () => {
    const { app, user } = await openTwoLevelsDeep();

    await reloginAs(user, ALICE);

    await waitFor(() => expect(screen.queryByText(MOBILE_LABELS.relogin.title)).toBeNull());
    expect(app.getPathname()).toBe(DETAIL_ROUTE);
    expect(screen.getByLabelText(DETAIL_LABEL)).toHaveProp("value", "draft");
    expect(router.canGoBack()).toBe(true);
  });

  it("the session running out on the clock opens the re-login sheet", async () => {
    await storedSession(10 * MINUTE_MS);
    await openApp(MOBILE_ROUTES.hubs.account);
    expect(await screen.findByText("Alice Nguyễn")).toBeOnTheScreen();
    expect(screen.queryByText(MOBILE_LABELS.relogin.title)).toBeNull();

    // Only the clock moves: nothing marks the session expired by hand.
    await act(async () => {
      jest.advanceTimersByTime(10 * MINUTE_MS + 30_000);
    });

    expect(screen.getByText(MOBILE_LABELS.relogin.title)).toBeOnTheScreen();
    // Still mounted under the sheet (hidden from screen readers while it is open).
    expect(screen.getByText("Alice Nguyễn", { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
