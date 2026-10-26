import { z } from "zod";

import { AUTH_ENDPOINTS } from "@/constants/mobile";

import { api } from "@/lib/api/client";

import { authUserSchema, loginRequestSchema } from "./auth-schemas";

import type { AuthUser, LoginRequest } from "./auth-schemas";

// BE develop: identity/internal/controller/dto/AuthTokenResponse.java.
export const authTokenSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal("Bearer"),
  expiresInSeconds: z.number().int().positive(),
});

export type AuthToken = z.infer<typeof authTokenSchema>;

export async function loginRequest(input: LoginRequest): Promise<AuthToken> {
  const { data } = await api.post<unknown>(AUTH_ENDPOINTS.login, loginRequestSchema.parse(input));
  return authTokenSchema.parse(data);
}

/**
 * The signed-in user. With `token` it asks about that token instead of the one in memory: a
 * sign-in or re-login checks its new token before anything else may use it, while the session on
 * screen keeps its own (the client lets a header the caller set win).
 */
export async function fetchMe({
  token,
  signal,
}: { token?: string; signal?: AbortSignal } = {}): Promise<AuthUser> {
  const { data } = await api.get<unknown>(AUTH_ENDPOINTS.me, {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return authUserSchema.parse(data);
}

/**
 * Asks the backend to end a session. With `token` it revokes that session instead of the one in
 * memory (a login whose `/me` failed has not been stored yet). Rejects on failure: logout is best
 * effort, so the caller decides to swallow the error and clear local state anyway.
 */
export async function logoutRequest(token?: string): Promise<void> {
  await api.post(
    AUTH_ENDPOINTS.logout,
    undefined,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );
}
