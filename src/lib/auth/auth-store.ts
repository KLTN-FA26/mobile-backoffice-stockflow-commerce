/**
 * UI state only. The bearer token lives in the token store (expo-secure-store); this store holds
 * what screens render from: who is signed in, when the session ends and whether it already did.
 * Same names and semantics as the web store, which the verbatim permission files read.
 */
import { create } from "zustand";

import { authUserSchema } from "./auth-schemas";

import type { AuthUser } from "./auth-schemas";

export type { AuthUser } from "./auth-schemas";
export type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

let revision = 0;
/** Bumped on every session change (login / logout); lets async session code detect a stale result. */
export const getAuthRevision = () => revision;

const sameProfile = (a: AuthUser, b: AuthUser) =>
  a.username === b.username &&
  a.email === b.email &&
  a.fullName === b.fullName &&
  a.status === b.status &&
  a.lastLoginAt === b.lastLoginAt &&
  a.roles.length === b.roles.length &&
  a.roles.every((role, index) => role === b.roles[index]);

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  bootstrapError: string | null;
  authorizationVersion: number;
  isAuthenticated: boolean;
  /** Epoch ms at which the bearer token stops working; null while no session is known. */
  sessionExpiresAt: number | null;
  /** The session ended (expiry or a 401) but the screen stays mounted until the user re-signs in. */
  sessionExpired: boolean;
  login: (user: AuthUser, expiresAt: number) => void;
  logout: () => void;
  reconcileSession: (user: AuthUser) => void;
  renewSession: (user: AuthUser, expiresAt: number) => void;
  beginBootstrap: () => void;
  failBootstrap: (message: string) => void;
  markSessionExpired: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Shared by login and reconcileSession; the latter may not know the expiry, hence the null.
  const establish = (user: AuthUser, expiresAt: number | null) => {
    const identity = authUserSchema.parse(user);
    revision++;
    set({
      authorizationVersion: get().authorizationVersion + 1,
      user: identity,
      status: "authenticated",
      isAuthenticated: true,
      bootstrapError: null,
      sessionExpiresAt: expiresAt,
      sessionExpired: false,
    });
  };

  return {
    user: null,
    status: "unknown",
    bootstrapError: null,
    authorizationVersion: 0,
    isAuthenticated: false,
    sessionExpiresAt: null,
    sessionExpired: false,
    login: (user, expiresAt) => establish(user, expiresAt),
    logout: () => {
      revision++;
      set({
        authorizationVersion: get().authorizationVersion + 1,
        user: null,
        status: "unauthenticated",
        isAuthenticated: false,
        bootstrapError: null,
        sessionExpiresAt: null,
        sessionExpired: false,
      });
    },
    /**
     * Background /me success. The same user is the same session: refresh profile fields only, with
     * no revision or authorizationVersion bump - a routine foreground check must not reset the
     * permission queries. A different (or newly discovered) user is a real session change and goes
     * through login, which retires the previous identity's authorization; the token is the same
     * one, so the expiry carries over.
     */
    reconcileSession: (user) => {
      const identity = authUserSchema.parse(user);
      const { user: current, status, sessionExpiresAt } = get();
      if (status === "authenticated" && current?.userId === identity.userId) {
        if (!sameProfile(current, identity)) set({ user: identity });
        return;
      }
      establish(identity, sessionExpiresAt);
    },
    /**
     * Same-user re-login over an expired session: new expiry, expired flag cleared and profile
     * refreshed in one update, with no revision or authorizationVersion bump. A version bump would
     * re-key the permission query and blank permission-gated screens (and their drafts) while it
     * reloads. Any other user is a programming error: a session change goes through login.
     */
    renewSession: (user, expiresAt) => {
      const identity = authUserSchema.parse(user);
      const { user: current, status } = get();
      if (status !== "authenticated" || current?.userId !== identity.userId) {
        throw new Error("renewSession only renews the signed-in user; use login for another user");
      }
      set({
        user: sameProfile(current, identity) ? current : identity,
        sessionExpiresAt: expiresAt,
        sessionExpired: false,
      });
    },
    /** Foreground only: no verified session exists yet, so protected UI may not render. */
    beginBootstrap: () =>
      set({
        user: null,
        status: "unknown",
        isAuthenticated: false,
        bootstrapError: null,
        sessionExpiresAt: null,
        sessionExpired: false,
      }),
    failBootstrap: (message) => set({ bootstrapError: message }),
    markSessionExpired: () => {
      if (get().status === "authenticated") set({ sessionExpired: true });
    },
  };
});
