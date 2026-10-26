/** Mobile client: calls the Spring backend directly, authenticating with a bearer token. */

import { AxiosHeaders, create as createAxios } from "axios";

import { BROWSER_API_TIMEOUT_MS } from "@/constants/auth";
import { AUTH_ENDPOINTS } from "@/constants/mobile";

import { getAccessToken } from "@/lib/auth/token-store";
import { APP_CONFIG } from "@/lib/config";
import { deviceUserAgent } from "@/lib/platform/user-agent";

import { ApiError } from "./error";
import { rememberRetryAfter } from "./retry-after";

import type { ApiErrorBody } from "./error";
import type { AxiosError } from "axios";

// With a bad EXPO_PUBLIC_API_URL the baseURL stays unset; the root layout shows the config error
// screen before any request is made.
export const api = createAxios({
  baseURL: APP_CONFIG.ok ? APP_CONFIG.apiUrl : undefined,
  timeout: BROWSER_API_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

/**
 * `requestToken` is the bearer token the failed request was sent with (null if none): after a
 * re-login, a 401 still arriving for the previous token says nothing about the current session.
 */
export type UnauthorizedHandler = (error: ApiError, requestToken: string | null) => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/** The session layer registers here to react to a 401 on a business endpoint. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

const BEARER_PREFIX = "Bearer ";

function pathOf(url: string | undefined): string | undefined {
  return url?.split("?")[0];
}

function isLogin(url: string | undefined): boolean {
  return pathOf(url) === AUTH_ENDPOINTS.login;
}

// login, me and logout answer a 401 themselves: a wrong password, a dead token at bootstrap or an
// already revoked session is not "the session expired while I was working". Every entry of
// AUTH_ENDPOINTS is exempt, so an endpoint added there later (change password…) never expires the
// session on a 401: its caller must handle that 401 itself, or the endpoint belongs elsewhere.
function isAuthEndpoint(url: string | undefined): boolean {
  const path = pathOf(url);
  return Object.values<string>(AUTH_ENDPOINTS).some((endpoint) => endpoint === path);
}

function retryAfterHeader(err: AxiosError<ApiErrorBody>): string | undefined {
  const headers = err.response?.headers;
  if (!headers) return undefined;
  // Axios hands the adapter's headers over as AxiosHeaders, whose lookup ignores case.
  const value =
    headers instanceof AxiosHeaders ? headers.get("retry-after") : headers["retry-after"];
  return typeof value === "string" ? value : undefined;
}

// The token the failed request was actually sent with (axios normalises request headers into
// AxiosHeaders before the adapter runs), not whatever is in memory by the time the 401 lands.
function requestBearerToken(err: AxiosError<ApiErrorBody>): string | null {
  const headers = err.config?.headers;
  const value = headers instanceof AxiosHeaders ? headers.get("Authorization") : undefined;
  return typeof value === "string" && value.startsWith(BEARER_PREFIX)
    ? value.slice(BEARER_PREFIX.length)
    : null;
}

/* ── Request interceptor ─────────────────────────────────────────────── */

api.interceptors.request.use((cfg) => {
  cfg.headers.set("Accept-Language", "vi");
  cfg.headers.set("X-Correlation-Id", crypto.randomUUID());
  cfg.headers.set("User-Agent", deviceUserAgent());
  // An Authorization header the caller set wins (logout with the token of a session that is not
  // the one in memory). Login never gets the memory token: Spring's bearer filter refuses an
  // expired token even on a public endpoint, so a re-login with a stale token in memory would 401.
  const token = getAccessToken();
  if (token && !cfg.headers.has("Authorization") && !isLogin(cfg.url)) {
    cfg.headers.set("Authorization", `${BEARER_PREFIX}${token}`);
  }
  return cfg;
});

/* ── Response interceptor ────────────────────────────────────────────── */

api.interceptors.response.use(
  (res) => {
    const body: unknown = res.data;
    if (
      typeof body === "object" &&
      body !== null &&
      "success" in body &&
      body.success === true &&
      "data" in body
    ) {
      return { ...res, data: body.data };
    }
    return res;
  },
  (err: AxiosError<ApiErrorBody>) => {
    const apiError = ApiError.from(err);
    rememberRetryAfter(apiError, retryAfterHeader(err));
    if (err.response?.status === 401 && !isAuthEndpoint(err.config?.url)) {
      unauthorizedHandler?.(apiError, requestBearerToken(err));
    }
    return Promise.reject(apiError);
  },
);
