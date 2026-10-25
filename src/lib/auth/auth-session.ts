/**
 * The session lifecycle the web left to its BFF: sign-in, bootstrap at app start, revalidation on
 * return to the foreground, expiry (a 401 or the clock), re-login and sign-out. The token has no
 * refresh: when it dies the session is marked expired and the screen stays mounted under the
 * re-login sheet.
 *
 * Two /me checks share one in-flight slot, as in the web `auth-session.ts`:
 * - bootstrap (foreground): nothing is verified yet. A 401 signs out; a server or network failure
 *   keeps `unknown` + bootstrapError so the app offers retry instead of the login screen.
 * - background (revalidation): a session is on screen and is not touched while /me runs. A 401
 *   only marks it expired; any other failure keeps the UI (the backend checks every request).
 * An answer is applied only if nothing superseded it meanwhile: a login/logout anywhere (auth
 * revision) or a session change made in this module (generation: sign-out, same-user re-login).
 *
 * `session:*` data (pending requestIds, scan error lists) belongs to one user, recorded under
 * `MOBILE_STORAGE_KEYS.sessionOwner`: every session commit claims it and wipes another user's
 * data first, so nothing reaches the next worker on a shared device, even after a restart.
 */
import { AUTH_ERROR_CODES, AUTH_UI } from "@/constants/auth";
import { MOBILE_STORAGE_KEYS } from "@/constants/mobile";

import { ApiError } from "@/lib/api/error";
import { sessionClearAll } from "@/lib/platform/session-store";
import { kv } from "@/lib/platform/storage";

import { fetchMe, loginRequest, logoutRequest } from "./auth-api";
import { getAuthRevision, useAuthStore } from "./auth-store";
import {
  clearSession,
  getAccessToken,
  loadSession,
  persistSession,
  setAccessToken,
} from "./token-store";

import type { AuthUser, LoginRequest } from "./auth-schemas";
import type { QueryClient } from "@tanstack/react-query";

export type ReauthOutcome = "same-user" | "switched-user";

let generation = 0;
let pendingCheck: Promise<void> | null = null;
let pendingSignIn: Promise<void> | null = null;
let pendingReauth: Promise<ReauthOutcome> | null = null;

const store = () => useAuthStore.getState();

const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;

const sessionBootstrapFailed = () =>
  new ApiError(0, AUTH_ERROR_CODES.sessionBootstrapFailed, AUTH_UI.bootstrapError);

/* ── session:* ownership ───────────────────────────────────────────── */

// Neither helper throws: a kv (SQLite) failure must not stop a sign-out or a re-login half way.
// It is logged and leaves the previous owner recorded, so the next sign-in retries the wipe.

/** Wipes `session:*` and forgets its owner. */
function wipeSessionData(): void {
  try {
    sessionClearAll();
    kv.remove(MOBILE_STORAGE_KEYS.sessionOwner);
  } catch (error: unknown) {
    console.error("Could not clear session data", error);
  }
}

/** Records `userId` as the owner of `session:*`, wiping another user's data first. */
function claimSessionData(userId: string): void {
  try {
    const owner = kv.get(MOBILE_STORAGE_KEYS.sessionOwner);
    if (owner !== null && owner !== userId) sessionClearAll();
    kv.set(MOBILE_STORAGE_KEYS.sessionOwner, userId);
  } catch (error: unknown) {
    console.error("Could not hand session data to the signed-in user", error);
  }
}

/** True while no session change happened since the call (see the module comment). */
function currentSessionGuard(): () => boolean {
  const mine = generation;
  const revision = getAuthRevision();
  return () => generation === mine && getAuthRevision() === revision;
}

/* ── /me checks ─────────────────────────────────────────────────────── */

function startCheck(check: (isCurrent: () => boolean) => Promise<void>): Promise<void> {
  pendingCheck = check(currentSessionGuard()).finally(() => {
    pendingCheck = null;
  });
  return pendingCheck;
}

async function bootstrap(isCurrent: () => boolean): Promise<void> {
  const session = await loadSession();
  if (!isCurrent()) return;
  if (session === null) {
    setAccessToken(null);
    store().logout();
    return;
  }
  setAccessToken(session.accessToken);
  store().beginBootstrap();
  try {
    const user = await fetchMe();
    if (!isCurrent()) return;
    claimSessionData(user.userId);
    store().login(user, session.expiresAt);
  } catch (error: unknown) {
    if (!isCurrent()) return;
    if (isUnauthorized(error)) {
      store().logout();
      await clearSession();
    } else {
      store().failBootstrap(AUTH_UI.bootstrapError);
    }
  }
}

async function revalidate(isCurrent: () => boolean): Promise<void> {
  try {
    const user = await fetchMe();
    if (isCurrent()) store().reconcileSession(user);
  } catch (error: unknown) {
    if (isCurrent() && isUnauthorized(error)) store().markSessionExpired();
  }
}

/** Verifies the stored session at app start (and on retry). Deduplicated. */
export function bootstrapSession(): Promise<void> {
  return pendingCheck ?? startCheck(bootstrap);
}

/** Background check of a live session; joins a check already in flight. */
export function revalidateSession(): Promise<void> {
  if (pendingCheck) return pendingCheck;
  const { status, sessionExpired } = store();
  if (status !== "authenticated" || sessionExpired) return Promise.resolve();
  return startCheck(revalidate);
}

/**
 * The HTTP client's 401 handler. It only acts on a live session, and only for the token in use:
 * a stray 401 after sign-out, the fifth of five parallel 401s, or a late 401 for a request sent
 * with the token a re-login replaced changes nothing. It runs unguarded inside the axios
 * interceptor, so it never throws; a store failure is logged (an uncaught throw is fatal on
 * React Native) and the request still rejects with its own ApiError.
 */
export function handleUnauthorized(_error: ApiError, requestToken: string | null): void {
  try {
    if (requestToken !== getAccessToken()) return;
    const { status, sessionExpired, markSessionExpired } = store();
    if (status === "authenticated" && !sessionExpired) markSessionExpired();
  } catch (error: unknown) {
    console.error("Could not mark the session expired", error);
  }
}

/* ── Sign-in, re-login, sign-out ────────────────────────────────────── */

/** Drops a token this module obtained but will not keep, and asks the backend to revoke it. */
async function discardToken(accessToken: string): Promise<void> {
  if (getAccessToken() === accessToken) setAccessToken(null);
  await logoutRequest(accessToken).catch(() => undefined);
}

/**
 * login → /me with the new token → SecureStore, then `commit` in the same tick. A login error
 * (wrong password, lock, rate limit…) passes through for the login form to map. Any later failure
 * discards the new token and throws SESSION_BOOTSTRAP_FAILED: no half-signed-in state remains.
 */
async function establishSession<T>(
  input: LoginRequest,
  now: number,
  commit: (user: AuthUser, expiresAt: number) => T,
): Promise<T> {
  const isCurrent = currentSessionGuard();
  const { accessToken, expiresInSeconds } = await loginRequest(input);
  const expiresAt = now + expiresInSeconds * 1000;
  setAccessToken(accessToken);
  let user: AuthUser;
  try {
    user = await fetchMe();
    await persistSession({ accessToken, expiresAt });
  } catch {
    await discardToken(accessToken);
    throw sessionBootstrapFailed();
  }
  if (!isCurrent()) {
    // Signed out while this ran: take the write back instead of reviving the session.
    await clearSession();
    await discardToken(accessToken);
    throw sessionBootstrapFailed();
  }
  return commit(user, expiresAt);
}

/** Login screen. A second call while one is in flight gets the same promise. */
export function signIn(input: LoginRequest, now = Date.now()): Promise<void> {
  pendingSignIn ??= establishSession(input, now, (user, expiresAt) => {
    claimSessionData(user.userId);
    store().login(user, expiresAt);
  }).finally(() => {
    pendingSignIn = null;
  });
  return pendingSignIn;
}

function resumeSession(user: AuthUser, expiresAt: number, queryClient: QueryClient): ReauthOutcome {
  const { status, user: previous } = store();
  if (status === "authenticated" && previous?.userId === user.userId) {
    // Same person, same screen: renew in place (see renewSession). Pending session:* data is
    // kept. A /me check sent with the dead token must not expire the new session.
    generation++;
    claimSessionData(user.userId);
    store().renewSession(user, expiresAt);
    void queryClient.invalidateQueries();
    return "same-user";
  }
  // Someone else: nothing of the previous user's may show through.
  queryClient.clear();
  wipeSessionData();
  claimSessionData(user.userId);
  store().login(user, expiresAt);
  return "switched-user";
}

/** Re-login sheet over an expired session. Deduplicated like signIn. */
export function reauthenticate(
  input: LoginRequest,
  queryClient: QueryClient,
  now = Date.now(),
): Promise<ReauthOutcome> {
  pendingReauth ??= establishSession(input, now, (user, expiresAt) =>
    resumeSession(user, expiresAt, queryClient),
  ).finally(() => {
    pendingReauth = null;
  });
  return pendingReauth;
}

/**
 * Local first: token (memory + SecureStore), session:* data, query cache and store are cleared
 * before the backend hears anything, so a weak network or an app killed mid-request cannot leave
 * the session behind for the next worker on a shared device. The backend logout then goes out with
 * the captured token, best effort; callers do not wait for it.
 */
export async function signOut(queryClient: QueryClient): Promise<void> {
  const token = getAccessToken();
  generation++;
  await clearSession();
  wipeSessionData();
  queryClient.clear();
  store().logout();
  if (token !== null) void logoutRequest(token).catch(() => undefined);
}
