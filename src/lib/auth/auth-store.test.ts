import { getAuthRevision, useAuthStore } from "./auth-store";

import type { AuthUser } from "./auth-store";

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
const EXPIRES_AT = 1_900_000_000_000;

const state = () => useAuthStore.getState();

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
});

describe("auth store", () => {
  it("starts unknown with no user and no expiry", () => {
    expect(state()).toMatchObject({
      user: null,
      status: "unknown",
      isAuthenticated: false,
      bootstrapError: null,
      authorizationVersion: 0,
      sessionExpiresAt: null,
      sessionExpired: false,
    });
  });

  it("login sets authenticated and bumps authorizationVersion", () => {
    const revision = getAuthRevision();
    state().login(ALICE, EXPIRES_AT);

    expect(state()).toMatchObject({
      user: ALICE,
      status: "authenticated",
      isAuthenticated: true,
      authorizationVersion: 1,
      sessionExpiresAt: EXPIRES_AT,
      sessionExpired: false,
      bootstrapError: null,
    });
    expect(getAuthRevision()).toBe(revision + 1);
  });

  it("login clears an earlier expired flag and bootstrap error", () => {
    state().login(ALICE, EXPIRES_AT);
    state().markSessionExpired();
    state().failBootstrap("boom");
    state().login(ALICE, EXPIRES_AT + 1);

    expect(state()).toMatchObject({
      sessionExpired: false,
      bootstrapError: null,
      authorizationVersion: 2,
    });
  });

  it("login normalises a missing full name to null", () => {
    // The BE omits null fields; the schema turns an absent value back into null.
    const { fullName: _omitted, ...withoutName } = ALICE;
    state().login(withoutName as AuthUser, EXPIRES_AT);
    expect(state().user?.fullName).toBeNull();
  });

  it("reconcile same user keeps version", () => {
    state().login(ALICE, EXPIRES_AT);
    const revision = getAuthRevision();
    const renamed: AuthUser = { ...ALICE, fullName: "Alice Nguyen" };

    state().reconcileSession(renamed);

    expect(state().user).toEqual(renamed);
    expect(state().authorizationVersion).toBe(1);
    expect(state().sessionExpiresAt).toBe(EXPIRES_AT);
    expect(getAuthRevision()).toBe(revision);
  });

  it("reconcile same user with an identical profile leaves the user object untouched", () => {
    state().login(ALICE, EXPIRES_AT);
    const before = state().user;

    state().reconcileSession({ ...ALICE });

    expect(state().user).toBe(before);
  });

  it("reconcile different user logs in again", () => {
    state().login(ALICE, EXPIRES_AT);
    state().markSessionExpired();
    const revision = getAuthRevision();

    state().reconcileSession(BOB);

    expect(state()).toMatchObject({
      user: BOB,
      status: "authenticated",
      authorizationVersion: 2,
      sessionExpiresAt: EXPIRES_AT,
      sessionExpired: false,
    });
    expect(getAuthRevision()).toBe(revision + 1);
  });

  it("reconcile with no session yet logs the user in with an unknown expiry", () => {
    state().reconcileSession(ALICE);

    expect(state()).toMatchObject({
      user: ALICE,
      status: "authenticated",
      authorizationVersion: 1,
      sessionExpiresAt: null,
    });
  });

  it("renewSession updates expiry atomically without bumping version", () => {
    state().login(ALICE, EXPIRES_AT);
    state().markSessionExpired();
    const revision = getAuthRevision();
    const renamed: AuthUser = { ...ALICE, fullName: "Alice Nguyen" };
    const listener = jest.fn();
    const unsubscribe = useAuthStore.subscribe(listener);

    state().renewSession(renamed, EXPIRES_AT + 1);
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(state()).toMatchObject({
      user: renamed,
      status: "authenticated",
      authorizationVersion: 1,
      sessionExpiresAt: EXPIRES_AT + 1,
      sessionExpired: false,
    });
    expect(getAuthRevision()).toBe(revision);
  });

  it("renewSession keeps the user object when the profile is unchanged", () => {
    state().login(ALICE, EXPIRES_AT);
    const before = state().user;

    state().renewSession({ ...ALICE }, EXPIRES_AT + 1);

    expect(state().user).toBe(before);
  });

  it("renewSession rejects a different user", () => {
    state().login(ALICE, EXPIRES_AT);
    state().markSessionExpired();

    expect(() => state().renewSession(BOB, EXPIRES_AT + 1)).toThrow(Error);
    expect(state()).toMatchObject({
      user: ALICE,
      sessionExpired: true,
      sessionExpiresAt: EXPIRES_AT,
    });

    state().logout();
    expect(() => state().renewSession(ALICE, EXPIRES_AT + 1)).toThrow(Error);
    expect(state().status).toBe("unauthenticated");
  });

  it("markSessionExpired only when authenticated", () => {
    state().markSessionExpired();
    expect(state().sessionExpired).toBe(false);

    state().beginBootstrap();
    state().markSessionExpired();
    expect(state().sessionExpired).toBe(false);

    state().logout();
    state().markSessionExpired();
    expect(state().sessionExpired).toBe(false);

    state().login(ALICE, EXPIRES_AT);
    state().markSessionExpired();
    expect(state()).toMatchObject({
      sessionExpired: true,
      status: "authenticated",
      user: ALICE,
    });
  });

  it("logout clears user and expiry", () => {
    state().login(ALICE, EXPIRES_AT);
    state().markSessionExpired();
    const revision = getAuthRevision();

    state().logout();

    expect(state()).toMatchObject({
      user: null,
      status: "unauthenticated",
      isAuthenticated: false,
      sessionExpiresAt: null,
      sessionExpired: false,
      bootstrapError: null,
      authorizationVersion: 2,
    });
    expect(getAuthRevision()).toBe(revision + 1);
  });

  it("beginBootstrap drops any identity and failBootstrap records the message", () => {
    state().login(ALICE, EXPIRES_AT);

    state().beginBootstrap();
    expect(state()).toMatchObject({
      user: null,
      status: "unknown",
      isAuthenticated: false,
      sessionExpiresAt: null,
      sessionExpired: false,
      bootstrapError: null,
    });

    state().failBootstrap("không kết nối được");
    expect(state().bootstrapError).toBe("không kết nối được");
    expect(state().status).toBe("unknown");
  });
});
