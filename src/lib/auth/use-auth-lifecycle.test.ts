import { act, renderHook, waitFor } from "@testing-library/react-native";
import MockAdapter from "axios-mock-adapter";
import { AppState } from "react-native";

import { AUTH_UI } from "@/constants/auth";

import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";

import { fetchMe } from "./auth-api";
import { useAuthStore } from "./auth-store";
import { persistSession, setAccessToken } from "./token-store";
import { useAuthLifecycle } from "./use-auth-lifecycle";

import type { AuthUser } from "./auth-schemas";
import type { AppStateStatus } from "react-native";

jest.mock("./auth-api", () => ({
  loginRequest: jest.fn(),
  fetchMe: jest.fn(),
  logoutRequest: jest.fn(),
}));

const me = jest.mocked(fetchMe);
const http = new MockAdapter(api);

const ALICE: AuthUser = {
  userId: "u-alice",
  username: "alice",
  email: "alice@stockflow.vn",
  fullName: "Alice",
  status: "ACTIVE",
  roles: [],
  lastLoginAt: null,
};

let emitAppState: (state: AppStateStatus) => void = () => undefined;
const removeAppStateListener = jest.fn();

const auth = () => useAuthStore.getState();

async function storeSession() {
  await persistSession({ accessToken: "tok-stored", expiresAt: Date.now() + 3_600_000 });
}

/** A 401 from a business endpoint, as the HTTP client sees it. */
async function businessUnauthorized() {
  http.onGet("/orders").reply(401, { errorCode: "UNAUTHORIZED" });
  await api.get("/orders").catch(() => undefined);
}

beforeEach(() => {
  me.mockReset().mockResolvedValue(ALICE);
  removeAppStateListener.mockClear();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    emitAppState = listener;
    return { remove: removeAppStateListener };
  });
});

afterEach(() => {
  http.reset();
  jest.restoreAllMocks();
});

afterAll(() => http.restore());

describe("useAuthLifecycle", () => {
  it("bootstraps an unknown session on mount", async () => {
    await storeSession();

    const { result } = await renderHook(() => useAuthLifecycle());

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(me).toHaveBeenCalledTimes(1);
    expect(auth().user).toEqual(ALICE);
  });

  it("does not bootstrap again when the session is already known", async () => {
    auth().login(ALICE, Date.now() + 3_600_000);

    await renderHook(() => useAuthLifecycle());

    expect(me).not.toHaveBeenCalled();
  });

  it("a failed bootstrap exposes the error and retry verifies again", async () => {
    await storeSession();
    me.mockRejectedValueOnce(new ApiError(0, "NETWORK_ERROR", "offline"));

    const { result } = await renderHook(() => useAuthLifecycle());
    await waitFor(() => expect(result.current.bootstrapError).toBe(AUTH_UI.bootstrapError));
    expect(result.current.status).toBe("unknown");

    await act(async () => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.bootstrapError).toBeNull();
    expect(me).toHaveBeenCalledTimes(2);
  });

  it("a 401 for a request sent with an older token leaves the current session alone", async () => {
    auth().login(ALICE, Date.now() + 3_600_000);
    setAccessToken("tok-old");
    await renderHook(() => useAuthLifecycle());
    // A re-login swaps the token while this request is still in flight.
    http.onGet("/orders").reply(() => {
      setAccessToken("tok-new");
      return [401, { errorCode: "UNAUTHORIZED" }];
    });

    await api.get("/orders").catch(() => undefined);

    expect(auth().sessionExpired).toBe(false);
  });

  it("registers the 401 handler while mounted and removes it on unmount", async () => {
    auth().login(ALICE, Date.now() + 3_600_000);
    setAccessToken("tok-live");
    const { unmount } = await renderHook(() => useAuthLifecycle());

    await businessUnauthorized();
    expect(auth().sessionExpired).toBe(true);

    auth().login(ALICE, Date.now() + 3_600_000);
    await act(async () => unmount());
    await businessUnauthorized();

    expect(auth().sessionExpired).toBe(false);
    expect(removeAppStateListener).toHaveBeenCalledTimes(1);
  });

  it("returning to the foreground revalidates an authenticated session", async () => {
    auth().login(ALICE, Date.now() + 3_600_000);
    await renderHook(() => useAuthLifecycle());
    me.mockRejectedValueOnce(new ApiError(401, "UNAUTHORIZED", "Unauthorized"));

    await act(async () => emitAppState("background"));
    expect(me).not.toHaveBeenCalled();

    await act(async () => emitAppState("active"));

    await waitFor(() => expect(auth().sessionExpired).toBe(true));
    expect(me).toHaveBeenCalledTimes(1);
    expect(auth().status).toBe("authenticated");
  });

  it("returning to the foreground retries a bootstrap that failed", async () => {
    await storeSession();
    me.mockRejectedValueOnce(new ApiError(503, "AUTHORIZATION_UNAVAILABLE", "down"));
    const { result } = await renderHook(() => useAuthLifecycle());
    await waitFor(() => expect(result.current.bootstrapError).toBe(AUTH_UI.bootstrapError));

    await act(async () => emitAppState("active"));

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
  });

  it("a signed-out app does not call /me when it returns to the foreground", async () => {
    auth().logout();
    await renderHook(() => useAuthLifecycle());

    await act(async () => emitAppState("active"));

    expect(me).not.toHaveBeenCalled();
  });
});
