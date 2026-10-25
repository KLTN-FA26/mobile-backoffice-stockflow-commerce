import { act, renderHook } from "@testing-library/react-native";

import { SESSION_LIMITS } from "@/constants/mobile";

import { useAuthStore } from "./auth-store";
import { useSessionExpiry } from "./use-session-expiry";

import type { AuthUser } from "./auth-schemas";

const NOW = 1_700_000_000_000;
const MINUTE_MS = 60_000;

const ALICE: AuthUser = {
  userId: "u-alice",
  username: "alice",
  email: "alice@stockflow.vn",
  fullName: "Alice",
  status: "ACTIVE",
  roles: [],
  lastLoginAt: null,
};

const auth = () => useAuthStore.getState();

let now = NOW;
const clock = () => now;

beforeEach(() => {
  now = NOW;
  jest.useFakeTimers();
});

afterEach(() => jest.useRealTimers());

async function advance(ms: number) {
  now += ms;
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe("useSessionExpiry", () => {
  it("warning at 15 minutes left", async () => {
    auth().login(ALICE, NOW + 15 * MINUTE_MS);

    const { result } = await renderHook(() => useSessionExpiry(clock));

    expect(result.current).toEqual({
      remainingMs: 15 * MINUTE_MS,
      warning: true,
      expired: false,
    });
  });

  it("no warning while more than 15 minutes are left, then a warning once the tick crosses it", async () => {
    auth().login(ALICE, NOW + 15 * MINUTE_MS + SESSION_LIMITS.tickMs);

    const { result } = await renderHook(() => useSessionExpiry(clock));
    expect(result.current.warning).toBe(false);

    await advance(SESSION_LIMITS.tickMs);

    expect(result.current).toEqual({
      remainingMs: 15 * MINUTE_MS,
      warning: true,
      expired: false,
    });
  });

  it("expired marks session expired", async () => {
    auth().login(ALICE, NOW + 20_000);

    const { result } = await renderHook(() => useSessionExpiry(clock));
    expect(result.current.expired).toBe(false);
    expect(auth().sessionExpired).toBe(false);

    await advance(SESSION_LIMITS.tickMs);

    expect(result.current).toEqual({ remainingMs: 0, warning: false, expired: true });
    expect(auth()).toMatchObject({ status: "authenticated", user: ALICE, sessionExpired: true });
  });

  it("a session already past its expiry is marked expired on mount", async () => {
    auth().login(ALICE, NOW - 1);

    const { result } = await renderHook(() => useSessionExpiry(clock));

    expect(result.current.expired).toBe(true);
    expect(auth().sessionExpired).toBe(true);
  });

  it("a renewed session is no longer expired", async () => {
    auth().login(ALICE, NOW - 1);
    const { result } = await renderHook(() => useSessionExpiry(clock));

    await act(async () => auth().login(ALICE, NOW + 8 * 60 * MINUTE_MS));

    expect(result.current).toEqual({
      remainingMs: 8 * 60 * MINUTE_MS,
      warning: false,
      expired: false,
    });
    expect(auth().sessionExpired).toBe(false);
  });

  it("without a known expiry there is nothing to count down", async () => {
    const { result } = await renderHook(() => useSessionExpiry(clock));

    expect(result.current).toEqual({ remainingMs: null, warning: false, expired: false });
  });
});
