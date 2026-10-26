import { focusManager, QueryClient } from "@tanstack/react-query";
import { act, screen, userEvent, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { Text, TextInput } from "react-native";

import { AUTH_ERROR_CODES, AUTH_UI } from "@/constants/auth";
import { MOBILE_STORAGE_KEYS } from "@/constants/mobile";
import { PERMISSION_QUERY } from "@/constants/permissions";

import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";
import { sessionGet, sessionSet } from "@/lib/platform/session-store";
import { kv } from "@/lib/platform/storage";

import { renderWithProviders } from "@/test/render";

import { fetchMe, loginRequest, logoutRequest } from "./auth-api";
import {
  bootstrapSession,
  handleUnauthorized,
  reauthenticate,
  revalidateSession,
  signIn,
  signOut,
} from "./auth-session";
import { useAuthStore } from "./auth-store";
import { Can } from "./components/Can";
import { PermissionBoundary } from "./components/PermissionBoundary";
import { getAccessToken, loadSession, persistSession, setAccessToken } from "./token-store";

import type { AuthToken } from "./auth-api";
import type { AuthUser } from "./auth-schemas";
import type { PermissionCode } from "./me-permissions";
import type { StoredSession } from "./token-store";
import type { ReactElement, ReactNode } from "react";

jest.mock("./auth-api", () => ({
  loginRequest: jest.fn(),
  fetchMe: jest.fn(),
  logoutRequest: jest.fn(),
}));

const login = jest.mocked(loginRequest);
const me = jest.mocked(fetchMe);
const logout = jest.mocked(logoutRequest);

const NOW = 1_700_000_000_000;
const HOUR_MS = 3_600_000;
const EIGHT_HOURS_S = 28_800;
const SECURE_KEY = MOBILE_STORAGE_KEYS.secureSession;
const OWNER_KEY = MOBILE_STORAGE_KEYS.sessionOwner;
const CREDENTIALS = { username: "alice", password: "s3cret" };
const ORDERS_KEY = ["orders", "list", {}];

const ALICE: AuthUser = {
  userId: "u-alice",
  username: "alice",
  email: "alice@stockflow.vn",
  fullName: "Alice",
  status: "ACTIVE",
  roles: ["ROLE_WAREHOUSE_STAFF"],
  lastLoginAt: null,
};
const BOB: AuthUser = { ...ALICE, userId: "u-bob", username: "bob", fullName: "Bob" };

const NEW_TOKEN: AuthToken = {
  accessToken: "tok-new",
  tokenType: "Bearer",
  expiresInSeconds: EIGHT_HOURS_S,
};

const unauthorized = () => new ApiError(401, "UNAUTHORIZED", "Unauthorized");
const networkDown = () => new ApiError(0, "NETWORK_ERROR", "Không kết nối được máy chủ.");
const authorizationUnavailable = () =>
  new ApiError(503, "AUTHORIZATION_UNAVAILABLE", "Authorization unavailable");

const auth = () => useAuthStore.getState();

/** A promise the test settles by hand, to hold a request in flight. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

/** The app as it looks with a live session: store, memory token, SecureStore copy, data owner. */
async function signedInAs(
  user: AuthUser,
  expiresAt = Date.now() + HOUR_MS,
): Promise<StoredSession> {
  const stored = { accessToken: "tok-old", expiresAt };
  auth().login(user, expiresAt);
  setAccessToken(stored.accessToken);
  await persistSession(stored);
  kv.set(OWNER_KEY, user.userId);
  return stored;
}

/** What a previous run left on disk: the session in SecureStore and its owner in the kv-store. */
async function storeSession(session: StoredSession, owner = ALICE.userId): Promise<void> {
  await persistSession(session);
  kv.set(OWNER_KEY, owner);
}

function seededQueryClient(): QueryClient {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(ORDERS_KEY, { items: ["SO-1"] });
  return queryClient;
}

/** The kv-store (SQLite) failing, as on a full or corrupt disk. */
function breakKvStore() {
  jest.spyOn(kv, "keys").mockImplementation(() => {
    throw new Error("SQLITE_FULL");
  });
  return jest.spyOn(console, "error").mockImplementation(() => undefined);
}

/** A screen with unsaved local input, shown only while a session exists (like the auth gate). */
function DraftScreen() {
  const status = useAuthStore((state) => state.status);
  return status === "authenticated" ? <DraftNote /> : <Text>Đăng nhập</Text>;
}

function DraftNote() {
  const [note, setNote] = useState("");
  return <TextInput accessibilityLabel="Ghi chú" value={note} onChangeText={setNote} />;
}

const SUPPLIERS_READ: PermissionCode = "procurement-suppliers:READ";

const grants = (permissions: PermissionCode[]) => ({
  roles: [],
  permissions,
  dataScope: "WAREHOUSE",
});

/** The two ways a screen is gated by permission, around the same content. */
const PERMISSION_GATES: [string, (children: ReactNode) => ReactElement][] = [
  ["Can", (children) => <Can permission={SUPPLIERS_READ}>{children}</Can>],
  [
    "PermissionBoundary",
    (children) => (
      <PermissionBoundary permissions={[SUPPLIERS_READ]}>{children}</PermissionBoundary>
    ),
  ],
];

/**
 * The worker pockets the phone and takes it out again: React Query refetches the permissions
 * (`refetchOnWindowFocus: "always"`).
 */
async function returnToForeground() {
  await act(async () => {
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  login.mockReset().mockResolvedValue(NEW_TOKEN);
  me.mockReset().mockResolvedValue(ALICE);
  logout.mockReset().mockResolvedValue(undefined);
});

afterEach(() => jest.restoreAllMocks());

describe("signIn", () => {
  it("signIn success persists session and authenticates", async () => {
    let tokenDuringMe: string | undefined;
    let memoryDuringMe: string | null = "unset";
    me.mockImplementation(async (options) => {
      tokenDuringMe = options?.token;
      memoryDuringMe = getAccessToken();
      return ALICE;
    });

    await signIn(CREDENTIALS, NOW);

    expect(login).toHaveBeenCalledWith(CREDENTIALS);
    // /me is asked with the new token itself; the one in memory changes only with the commit.
    expect(tokenDuringMe).toBe("tok-new");
    expect(memoryDuringMe).toBeNull();
    expect(await loadSession(NOW)).toEqual({
      accessToken: "tok-new",
      expiresAt: NOW + EIGHT_HOURS_S * 1000,
    });
    expect(getAccessToken()).toBe("tok-new");
    expect(auth()).toMatchObject({
      status: "authenticated",
      user: ALICE,
      sessionExpiresAt: NOW + EIGHT_HOURS_S * 1000,
      sessionExpired: false,
    });
  });

  it("signIn with failing me logs token out and throws SESSION_BOOTSTRAP_FAILED", async () => {
    auth().logout();
    me.mockRejectedValue(authorizationUnavailable());
    // The revoke is best effort: its own failure must not hide the real error.
    logout.mockRejectedValue(networkDown());

    const error = await signIn(CREDENTIALS, NOW).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 0,
      code: AUTH_ERROR_CODES.sessionBootstrapFailed,
      message: AUTH_UI.bootstrapError,
    });
    expect(logout).toHaveBeenCalledWith("tok-new");
    expect(getAccessToken()).toBeNull();
    expect(await SecureStore.getItemAsync(SECURE_KEY)).toBeNull();
    expect(auth()).toMatchObject({ status: "unauthenticated", user: null });
  });

  it("signIn that cannot store the session revokes the token and throws SESSION_BOOTSTRAP_FAILED", async () => {
    auth().logout();
    jest.spyOn(SecureStore, "setItemAsync").mockRejectedValueOnce(new Error("keystore down"));

    await expect(signIn(CREDENTIALS, NOW)).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.sessionBootstrapFailed,
      message: AUTH_UI.bootstrapError,
    });

    expect(logout).toHaveBeenCalledWith("tok-new");
    expect(getAccessToken()).toBeNull();
    expect(auth()).toMatchObject({ status: "unauthenticated", user: null });
  });

  it("a rejected login keeps its own error for the login form, and the next try goes out", async () => {
    auth().logout();
    const wrongPassword = unauthorized();
    login.mockRejectedValueOnce(wrongPassword);

    await expect(signIn(CREDENTIALS, NOW)).rejects.toBe(wrongPassword);
    expect(me).not.toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();

    await signIn(CREDENTIALS, NOW);
    expect(login).toHaveBeenCalledTimes(2);
    expect(auth().status).toBe("authenticated");
  });

  it("concurrent signIn calls hit login once", async () => {
    const pending = deferred<AuthToken>();
    login.mockReturnValueOnce(pending.promise);

    const first = signIn(CREDENTIALS, NOW);
    const second = signIn(CREDENTIALS, NOW);
    expect(second).toBe(first);

    pending.resolve(NEW_TOKEN);
    await first;
    expect(login).toHaveBeenCalledTimes(1);

    // The lock only lasts while a sign-in is in flight.
    await signIn(CREDENTIALS, NOW);
    expect(login).toHaveBeenCalledTimes(2);
  });

  it("sign-in as a different user after restart clears previous session data", async () => {
    // Alice's app was killed before she signed out: her data and ownership are still on disk.
    kv.set(OWNER_KEY, ALICE.userId);
    sessionSet("x", 1);
    me.mockResolvedValue(BOB);

    await signIn(CREDENTIALS, NOW);

    expect(sessionGet("x")).toBeNull();
    expect(kv.get(OWNER_KEY)).toBe(BOB.userId);
    expect(auth().user).toEqual(BOB);
  });

  it("sign-in as the same user keeps session data", async () => {
    kv.set(OWNER_KEY, ALICE.userId);
    sessionSet("x", 1);

    await signIn(CREDENTIALS, NOW);

    expect(sessionGet("x")).toBe(1);
    expect(kv.get(OWNER_KEY)).toBe(ALICE.userId);
  });

  it("owner-less session data is wiped on claim", async () => {
    // Data whose owner was never recorded (or got lost) could be anybody's.
    sessionSet("x", 1);

    await signIn(CREDENTIALS, NOW);

    expect(sessionGet("x")).toBeNull();
    expect(kv.get(OWNER_KEY)).toBe(ALICE.userId);
  });
});

describe("bootstrapSession", () => {
  it("bootstrap without stored session goes unauthenticated", async () => {
    await bootstrapSession();

    expect(auth()).toMatchObject({ status: "unauthenticated", user: null });
    expect(me).not.toHaveBeenCalled();
  });

  it("an expired stored session goes unauthenticated without asking the backend", async () => {
    await persistSession({ accessToken: "tok-stored", expiresAt: Date.now() - 1 });

    await bootstrapSession();

    expect(auth().status).toBe("unauthenticated");
    expect(getAccessToken()).toBeNull();
    expect(me).not.toHaveBeenCalled();
  });

  it("stored token without session owner is signed out at bootstrap", async () => {
    // A reinstall wipes the kv-store, but the iOS Keychain keeps the token: nothing on this device
    // says whose it is any more.
    await persistSession({ accessToken: "tok-stored", expiresAt: Date.now() + HOUR_MS });

    await bootstrapSession();

    expect(auth()).toMatchObject({ status: "unauthenticated", user: null });
    expect(me).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    expect(await SecureStore.getItemAsync(SECURE_KEY)).toBeNull();
    expect(logout).toHaveBeenCalledWith("tok-stored");
  });

  it("a stored session is verified with /me, then restored with its expiry", async () => {
    const expiresAt = Date.now() + HOUR_MS;
    await storeSession({ accessToken: "tok-stored", expiresAt });
    auth().failBootstrap(AUTH_UI.bootstrapError);
    let tokenDuringMe: string | null = null;
    let stateDuringMe: ReturnType<typeof auth> | null = null;
    me.mockImplementation(async () => {
      tokenDuringMe = getAccessToken();
      stateDuringMe = auth();
      return ALICE;
    });

    await bootstrapSession();

    expect(tokenDuringMe).toBe("tok-stored");
    // Verifying: no user yet, and the previous attempt's error is gone.
    expect(stateDuringMe).toMatchObject({ status: "unknown", user: null, bootstrapError: null });
    expect(auth()).toMatchObject({
      status: "authenticated",
      user: ALICE,
      sessionExpiresAt: expiresAt,
      sessionExpired: false,
    });
  });

  it("a restored session claims session data, wiping another user's", async () => {
    await storeSession({ accessToken: "tok-stored", expiresAt: Date.now() + HOUR_MS });
    kv.set(OWNER_KEY, BOB.userId);
    sessionSet("x", 1);

    await bootstrapSession();

    expect(sessionGet("x")).toBeNull();
    expect(kv.get(OWNER_KEY)).toBe(ALICE.userId);
  });

  it("bootstrap 401 clears session", async () => {
    await storeSession({ accessToken: "tok-stored", expiresAt: Date.now() + HOUR_MS });
    me.mockRejectedValue(unauthorized());

    await bootstrapSession();

    expect(auth()).toMatchObject({ status: "unauthenticated", user: null });
    expect(getAccessToken()).toBeNull();
    expect(await SecureStore.getItemAsync(SECURE_KEY)).toBeNull();
  });

  it.each([
    ["network error", networkDown()],
    ["503 AUTHORIZATION_UNAVAILABLE", authorizationUnavailable()],
  ])("bootstrap %s keeps unknown with bootstrapError", async (_name, failure) => {
    const stored = { accessToken: "tok-stored", expiresAt: Date.now() + HOUR_MS };
    await storeSession(stored);
    me.mockRejectedValue(failure);

    await bootstrapSession();

    expect(auth()).toMatchObject({
      status: "unknown",
      user: null,
      bootstrapError: AUTH_UI.bootstrapError,
    });
    expect(await loadSession()).toEqual(stored);
  });

  it("concurrent bootstraps share one /me request", async () => {
    await storeSession({ accessToken: "tok-stored", expiresAt: Date.now() + HOUR_MS });
    const pending = deferred<AuthUser>();
    me.mockReturnValueOnce(pending.promise);

    const first = bootstrapSession();
    const second = bootstrapSession();
    expect(second).toBe(first);
    pending.resolve(ALICE);
    await first;

    expect(me).toHaveBeenCalledTimes(1);
    expect(auth().status).toBe("authenticated");
  });

  it("a bootstrap answer that arrives after sign-out is ignored", async () => {
    await storeSession({ accessToken: "tok-stored", expiresAt: Date.now() + HOUR_MS });
    const pending = deferred<AuthUser>();
    me.mockReturnValueOnce(pending.promise);

    const bootstrap = bootstrapSession();
    await waitFor(() => expect(me).toHaveBeenCalled());
    await signOut(seededQueryClient());
    pending.resolve(ALICE);
    await bootstrap;

    expect(auth()).toMatchObject({ status: "unauthenticated", user: null });
    expect(getAccessToken()).toBeNull();
  });

  it("a bootstrap 401 that arrives after a new sign-in does not sign it out", async () => {
    await storeSession({ accessToken: "tok-stored", expiresAt: Date.now() + HOUR_MS });
    const stale = deferred<AuthUser>();
    me.mockReturnValueOnce(stale.promise);

    const bootstrap = bootstrapSession();
    await waitFor(() => expect(me).toHaveBeenCalled());
    await signIn(CREDENTIALS, NOW);
    stale.reject(unauthorized());
    await bootstrap;

    expect(auth()).toMatchObject({ status: "authenticated", user: ALICE });
    expect(getAccessToken()).toBe("tok-new");
    expect(await loadSession(NOW)).toMatchObject({ accessToken: "tok-new" });
  });
});

describe("revalidateSession", () => {
  it("revalidate 401 marks session expired without logging out", async () => {
    const stored = await signedInAs(ALICE);
    me.mockRejectedValue(unauthorized());

    await revalidateSession();

    expect(auth()).toMatchObject({
      status: "authenticated",
      user: ALICE,
      sessionExpired: true,
    });
    expect(logout).not.toHaveBeenCalled();
    expect(await loadSession()).toEqual(stored);
    expect(getAccessToken()).toBe("tok-old");
  });

  it("a successful revalidation refreshes the profile without resetting authorization", async () => {
    await signedInAs(ALICE);
    const version = auth().authorizationVersion;
    me.mockResolvedValue({ ...ALICE, fullName: "Alice Nguyễn" });

    await revalidateSession();

    expect(auth().user?.fullName).toBe("Alice Nguyễn");
    expect(auth().authorizationVersion).toBe(version);
  });

  it.each([
    ["network error", networkDown()],
    ["503 AUTHORIZATION_UNAVAILABLE", authorizationUnavailable()],
  ])("a revalidation %s keeps the screen as it is", async (_name, failure) => {
    await signedInAs(ALICE);
    const before = auth();
    me.mockRejectedValue(failure);

    await revalidateSession();

    expect(auth()).toBe(before);
  });

  it("revalidation only runs for a live authenticated session", async () => {
    await revalidateSession();
    auth().logout();
    await revalidateSession();
    await signedInAs(ALICE);
    auth().markSessionExpired();
    await revalidateSession();

    expect(me).not.toHaveBeenCalled();
  });

  it("a revalidation answer that arrives after sign-out does not sign the user back in", async () => {
    await signedInAs(ALICE);
    const pending = deferred<AuthUser>();
    me.mockReturnValueOnce(pending.promise);

    const check = revalidateSession();
    await signOut(seededQueryClient());
    pending.resolve(ALICE);
    await check;

    expect(auth()).toMatchObject({ status: "unauthenticated", user: null });
  });
});

describe("handleUnauthorized", () => {
  it("expired session keeps screen mounted", async () => {
    await renderWithProviders(<DraftScreen />, { user: ALICE });
    setAccessToken("tok-old");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Ghi chú"), "draft");

    await act(async () => handleUnauthorized(unauthorized(), "tok-old"));

    expect(auth()).toMatchObject({ status: "authenticated", sessionExpired: true });
    expect(screen.getByLabelText("Ghi chú")).toHaveDisplayValue("draft");
  });

  it("does nothing without an authenticated session (a stray 401 after sign-out)", () => {
    handleUnauthorized(unauthorized(), null);
    expect(auth()).toMatchObject({ status: "unknown", sessionExpired: false });

    auth().logout();
    handleUnauthorized(unauthorized(), null);
    expect(auth()).toMatchObject({ status: "unauthenticated", sessionExpired: false });
  });

  it("tokenless 401 is ignored", () => {
    // A request that carried no token says nothing about the session, even when none is in memory.
    auth().login(ALICE, Date.now() + HOUR_MS);

    handleUnauthorized(unauthorized(), null);

    expect(auth()).toMatchObject({ status: "authenticated", sessionExpired: false });
  });

  it("several parallel 401s expire the session once", async () => {
    await signedInAs(ALICE);
    const listener = jest.fn();
    const unsubscribe = useAuthStore.subscribe(listener);

    handleUnauthorized(unauthorized(), "tok-old");
    handleUnauthorized(unauthorized(), "tok-old");
    handleUnauthorized(unauthorized(), "tok-old");
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(auth().sessionExpired).toBe(true);
  });

  it("never throws into the HTTP client; a store failure is logged instead", async () => {
    await signedInAs(ALICE);
    const failure = new Error("listener failed");
    const unsubscribe = useAuthStore.subscribe(() => {
      throw failure;
    });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => handleUnauthorized(unauthorized(), "tok-old")).not.toThrow();
    unsubscribe();

    expect(consoleError).toHaveBeenCalledWith(expect.any(String), failure);
  });
});

describe("reauthenticate", () => {
  it("reauthenticate with another user clears caches", async () => {
    await signedInAs(ALICE);
    auth().markSessionExpired();
    const queryClient = seededQueryClient();
    sessionSet("x", 1);
    me.mockResolvedValue(BOB);
    // What was left of Alice at the moment Bob's session became visible.
    let leftAtLogin: { queries: number; sessionData: unknown } | null = null;
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.user?.userId === BOB.userId && leftAtLogin === null) {
        leftAtLogin = {
          queries: queryClient.getQueryCache().getAll().length,
          sessionData: sessionGet("x"),
        };
      }
    });

    const outcome = await reauthenticate(CREDENTIALS, queryClient, NOW);
    unsubscribe();

    expect(outcome).toBe("switched-user");
    expect(leftAtLogin).toEqual({ queries: 0, sessionData: null });
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(sessionGet("x")).toBeNull();
    expect(kv.get(OWNER_KEY)).toBe(BOB.userId);
    expect(auth()).toMatchObject({
      status: "authenticated",
      user: BOB,
      sessionExpired: false,
      sessionExpiresAt: NOW + EIGHT_HOURS_S * 1000,
    });
    expect(await loadSession(NOW)).toEqual({
      accessToken: "tok-new",
      expiresAt: NOW + EIGHT_HOURS_S * 1000,
    });
  });

  it("a switched-user re-login still completes when the kv-store fails", async () => {
    await signedInAs(ALICE);
    auth().markSessionExpired();
    const queryClient = seededQueryClient();
    me.mockResolvedValue(BOB);
    const consoleError = breakKvStore();

    await expect(reauthenticate(CREDENTIALS, queryClient, NOW)).resolves.toBe("switched-user");

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(auth()).toMatchObject({ status: "authenticated", user: BOB, sessionExpired: false });
    // Alice stays recorded as the owner, so the next sign-in tries the wipe again.
    expect(kv.get(OWNER_KEY)).toBe(ALICE.userId);
    expect(consoleError).toHaveBeenCalled();
  });

  it("reauthenticate same user keeps cache and returns same-user", async () => {
    await signedInAs(ALICE);
    auth().markSessionExpired();
    const version = auth().authorizationVersion;
    const queryClient = seededQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    sessionSet("x", 1);

    const outcome = await reauthenticate(CREDENTIALS, queryClient, NOW);

    expect(outcome).toBe("same-user");
    expect(queryClient.getQueryData(ORDERS_KEY)).toEqual({ items: ["SO-1"] });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(sessionGet("x")).toBe(1);
    expect(getAccessToken()).toBe("tok-new");
    expect(await loadSession(NOW)).toEqual({
      accessToken: "tok-new",
      expiresAt: NOW + EIGHT_HOURS_S * 1000,
    });
    expect(auth()).toMatchObject({
      status: "authenticated",
      user: ALICE,
      sessionExpired: false,
      sessionExpiresAt: NOW + EIGHT_HOURS_S * 1000,
      authorizationVersion: version,
    });
  });

  it("a same-user re-login keeps a permission-gated screen and its draft mounted", async () => {
    jest.spyOn(api, "get").mockResolvedValue({
      data: { roles: [], permissions: ["procurement-suppliers:READ"], dataScope: "WAREHOUSE" },
    });
    const { queryClient } = await renderWithProviders(
      <Can permission="procurement-suppliers:READ">
        <DraftNote />
      </Can>,
      { user: ALICE, permissions: ["procurement-suppliers:READ"] },
    );
    setAccessToken("tok-old");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Ghi chú"), "draft");
    await act(async () => handleUnauthorized(unauthorized(), "tok-old"));

    await act(async () => {
      await reauthenticate(CREDENTIALS, queryClient, Date.now());
    });

    expect(auth().sessionExpired).toBe(false);
    expect(screen.getByLabelText("Ghi chú")).toHaveDisplayValue("draft");
  });

  describe.each(PERMISSION_GATES)("%s over a failed permission refetch", (_name, gate) => {
    afterEach(() => focusManager.setFocused(undefined));

    it("keeps the screen and its draft after a 401 from the expired session, through re-login", async () => {
      const get = jest.spyOn(api, "get").mockRejectedValue(unauthorized());
      const { queryClient } = await renderWithProviders(gate(<DraftNote />), {
        user: ALICE,
        permissions: [SUPPLIERS_READ],
      });
      setAccessToken("tok-old");
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Ghi chú"), "draft");
      await act(async () => handleUnauthorized(unauthorized(), "tok-old"));

      await returnToForeground();

      expect(get).toHaveBeenCalledWith(PERMISSION_QUERY.path, expect.anything());
      expect(screen.getByLabelText("Ghi chú")).toHaveDisplayValue("draft");

      get.mockResolvedValue({ data: grants([SUPPLIERS_READ]) });
      await act(async () => {
        await reauthenticate(CREDENTIALS, queryClient, Date.now());
      });

      expect(auth().sessionExpired).toBe(false);
      expect(screen.getByLabelText("Ghi chú")).toHaveDisplayValue("draft");
    });

    it("keeps the screen and its draft after a network failure", async () => {
      const get = jest.spyOn(api, "get").mockRejectedValue(networkDown());
      await renderWithProviders(gate(<DraftNote />), {
        user: ALICE,
        permissions: [SUPPLIERS_READ],
      });
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Ghi chú"), "draft");

      await returnToForeground();

      expect(get).toHaveBeenCalledWith(PERMISSION_QUERY.path, expect.anything());
      expect(screen.getByLabelText("Ghi chú")).toHaveDisplayValue("draft");
    });
  });

  it("a 401 from a request sent with the previous token does not expire the renewed session", async () => {
    await signedInAs(ALICE);
    auth().markSessionExpired();
    await reauthenticate(CREDENTIALS, seededQueryClient(), NOW);

    handleUnauthorized(unauthorized(), "tok-old");
    expect(auth().sessionExpired).toBe(false);

    // A 401 for the token now in use is real.
    handleUnauthorized(unauthorized(), "tok-new");
    expect(auth().sessionExpired).toBe(true);
  });

  it("a revalidation 401 sent before a same-user re-login does not expire the new session", async () => {
    await signedInAs(ALICE);
    const stale = deferred<AuthUser>();
    me.mockReturnValueOnce(stale.promise);
    const check = revalidateSession();
    auth().markSessionExpired();

    await reauthenticate(CREDENTIALS, seededQueryClient(), NOW);
    stale.reject(unauthorized());
    await check;

    expect(auth()).toMatchObject({ status: "authenticated", sessionExpired: false });
  });

  it("a failed re-login keeps the expired session on screen for another try", async () => {
    await signedInAs(ALICE);
    auth().markSessionExpired();
    me.mockRejectedValue(networkDown());

    await expect(reauthenticate(CREDENTIALS, seededQueryClient(), NOW)).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.sessionBootstrapFailed,
    });

    expect(logout).toHaveBeenCalledWith("tok-new");
    expect(auth()).toMatchObject({ status: "authenticated", user: ALICE, sessionExpired: true });
  });

  it("signing out while a re-login is in flight does not sign back in", async () => {
    await signedInAs(ALICE);
    auth().markSessionExpired();
    const pending = deferred<AuthUser>();
    me.mockReturnValueOnce(pending.promise);
    const queryClient = seededQueryClient();

    const relogin = reauthenticate(CREDENTIALS, queryClient, NOW);
    await signOut(queryClient);
    pending.resolve(ALICE);

    await expect(relogin).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.sessionBootstrapFailed,
    });
    expect(logout).toHaveBeenCalledWith("tok-new");
    expect(auth()).toMatchObject({ status: "unauthenticated", user: null });
    expect(getAccessToken()).toBeNull();
    expect(await SecureStore.getItemAsync(SECURE_KEY)).toBeNull();
  });

  it("a re-login that completes while sign-out is clearing local state is abandoned", async () => {
    await signedInAs(ALICE);
    auth().markSessionExpired();
    const clearing = deferred<undefined>();
    const queryClient = seededQueryClient();

    const relogin = reauthenticate(CREDENTIALS, queryClient, NOW);
    jest.spyOn(SecureStore, "deleteItemAsync").mockReturnValueOnce(clearing.promise);
    const leaving = signOut(queryClient);

    await expect(relogin).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.sessionBootstrapFailed,
    });
    // The new token is revoked and the expired session is not renewed in the meantime.
    expect(logout).toHaveBeenCalledWith("tok-new");
    expect(auth()).toMatchObject({ user: ALICE, sessionExpired: true });

    clearing.resolve(undefined);
    await leaving;
    expect(auth()).toMatchObject({ status: "unauthenticated", user: null });
  });

  it("early relogin whose /me fails keeps the still-valid session", async () => {
    // Ten minutes left: the expiry banner offers a re-login while the session still works.
    const stored = await signedInAs(ALICE, Date.now() + 10 * 60_000);
    me.mockRejectedValue(networkDown());

    await expect(reauthenticate(CREDENTIALS, seededQueryClient(), NOW)).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.sessionBootstrapFailed,
    });

    // The next request still goes out with the old token, and the session is not marked expired.
    expect(getAccessToken()).toBe("tok-old");
    expect(await loadSession()).toEqual(stored);
    expect(auth()).toMatchObject({ status: "authenticated", user: ALICE, sessionExpired: false });
    expect(logout).toHaveBeenCalledWith("tok-new");
    expect(logout).not.toHaveBeenCalledWith("tok-old");
  });

  it("abandoned relogin does not clear the current session", async () => {
    await signedInAs(ALICE);
    auth().markSessionExpired();
    const pending = deferred<AuthUser>();
    me.mockReturnValueOnce(pending.promise);
    login
      .mockResolvedValueOnce(NEW_TOKEN)
      .mockResolvedValueOnce({ ...NEW_TOKEN, accessToken: "tok-other" });

    const relogin = reauthenticate(CREDENTIALS, seededQueryClient(), NOW);
    await waitFor(() => expect(me).toHaveBeenCalledTimes(1));
    // Another session is committed meanwhile: the re-login's answer is stale when it lands.
    await signIn(CREDENTIALS, NOW);
    pending.resolve(ALICE);

    await expect(relogin).rejects.toMatchObject({
      code: AUTH_ERROR_CODES.sessionBootstrapFailed,
    });
    expect(getAccessToken()).toBe("tok-other");
    expect(await loadSession(NOW)).toMatchObject({ accessToken: "tok-other" });
    expect(auth()).toMatchObject({ status: "authenticated", user: ALICE, sessionExpired: false });
    expect(logout).toHaveBeenCalledWith("tok-new");
    expect(logout).not.toHaveBeenCalledWith("tok-other");
  });

  it("relogin failure is shown without waiting for logout", async () => {
    await signedInAs(ALICE);
    auth().markSessionExpired();
    me.mockRejectedValue(networkDown());
    const backend = deferred<undefined>();
    logout.mockReturnValue(backend.promise);
    let outcome: unknown = "pending";

    void reauthenticate(CREDENTIALS, seededQueryClient(), NOW).catch((error: unknown) => {
      outcome = error;
    });
    // Every local step has settled; only the backend logout is still on its way.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(logout).toHaveBeenCalledWith("tok-new");
    expect(outcome).toMatchObject({ code: AUTH_ERROR_CODES.sessionBootstrapFailed });
    backend.resolve(undefined);
  });

  it.each([
    ["same user", ALICE, "same-user"],
    ["another user", BOB, "switched-user"],
  ] as const)(
    "successful relogin revokes the previous token (%s)",
    async (_name, next, outcome) => {
      await signedInAs(ALICE);
      auth().markSessionExpired();
      me.mockResolvedValue(next);

      await expect(reauthenticate(CREDENTIALS, seededQueryClient(), NOW)).resolves.toBe(outcome);

      expect(getAccessToken()).toBe("tok-new");
      expect(logout).toHaveBeenCalledTimes(1);
      expect(logout).toHaveBeenCalledWith("tok-old");
    },
  );
});

describe("signOut", () => {
  it("signOut clears secure store, session data and cache even when logout request fails", async () => {
    await signedInAs(ALICE);
    sessionSet("x", 1);
    const queryClient = seededQueryClient();
    logout.mockRejectedValue(networkDown());

    await signOut(queryClient);

    // The backend is asked to end this very session, with the token captured before clearing.
    expect(logout).toHaveBeenCalledWith("tok-old");
    expect(await SecureStore.getItemAsync(SECURE_KEY)).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(sessionGet("x")).toBeNull();
    expect(kv.get(OWNER_KEY)).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(auth()).toMatchObject({ status: "unauthenticated", user: null });
  });

  it("signOut clears local state before the logout request settles", async () => {
    await signedInAs(ALICE);
    sessionSet("x", 1);
    const queryClient = seededQueryClient();
    const backend = deferred<undefined>();
    logout.mockReturnValue(backend.promise);

    await signOut(queryClient);

    expect(logout).toHaveBeenCalledWith("tok-old");
    expect(auth()).toMatchObject({ status: "unauthenticated", user: null });
    expect(await SecureStore.getItemAsync(SECURE_KEY)).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(sessionGet("x")).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    backend.resolve(undefined);
  });

  it("signOut without a token in memory does not call the backend", async () => {
    auth().login(ALICE, Date.now() + HOUR_MS);

    await signOut(seededQueryClient());

    expect(logout).not.toHaveBeenCalled();
    expect(auth().status).toBe("unauthenticated");
  });

  it("signOut finishes the local sign-out even when the kv-store fails", async () => {
    await signedInAs(ALICE);
    const queryClient = seededQueryClient();
    const consoleError = breakKvStore();

    await expect(signOut(queryClient)).resolves.toBeUndefined();

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(auth()).toMatchObject({ status: "unauthenticated", user: null });
    expect(await SecureStore.getItemAsync(SECURE_KEY)).toBeNull();
    expect(logout).toHaveBeenCalledWith("tok-old");
    // The owner stays recorded, so another user's next sign-in retries the wipe.
    expect(kv.get(OWNER_KEY)).toBe(ALICE.userId);
    expect(consoleError).toHaveBeenCalled();
  });
});
