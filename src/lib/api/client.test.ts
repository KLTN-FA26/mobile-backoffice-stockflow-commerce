import MockAdapter from "axios-mock-adapter";

import { BROWSER_API_TIMEOUT_MS } from "@/constants/auth";
import { AUTH_ENDPOINTS } from "@/constants/mobile";

import { setAccessToken } from "@/lib/auth/token-store";

import { sentHeaders } from "@/test/request-headers";

import { api, setUnauthorizedHandler } from "./client";
import { ApiError } from "./error";
import { getRetryAfterSeconds } from "./retry-after";

const API_URL = "https://api.test/api/v1";
const USER_AGENT = "StockFlowMobile/0.1.0 (Android 14; Pixel 7)";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

jest.mock("@/lib/config", () => ({
  APP_CONFIG: { ok: true, apiUrl: "https://api.test/api/v1" },
}));
jest.mock("@/lib/platform/user-agent", () => ({
  deviceUserAgent: () => "StockFlowMobile/0.1.0 (Android 14; Pixel 7)",
}));

const mock = new MockAdapter(api);

async function rejection(request: Promise<unknown>): Promise<unknown> {
  try {
    await request;
  } catch (error) {
    return error;
  }
  throw new Error("expected the request to fail");
}

describe("api client", () => {
  beforeEach(() => {
    mock.onGet("/ping").reply(200, { success: true, data: {} });
  });

  afterEach(() => {
    mock.reset();
    setAccessToken(null);
    setUnauthorizedHandler(null);
  });

  describe("request", () => {
    it("adds bearer, language, correlation id and user agent", async () => {
      setAccessToken("tok-123");
      await api.get("/ping");

      expect(sentHeaders(mock.history.get[0])).toMatchObject({
        Authorization: "Bearer tok-123",
        "Accept-Language": "vi",
        "User-Agent": USER_AGENT,
        "Content-Type": "application/json",
      });
      expect(sentHeaders(mock.history.get[0])["X-Correlation-Id"]).toMatch(UUID_PATTERN);
    });

    it("targets the configured base url with the shared timeout", async () => {
      await api.get("/ping");

      expect(mock.history.get[0]?.baseURL).toBe(API_URL);
      expect(mock.history.get[0]?.timeout).toBe(BROWSER_API_TIMEOUT_MS);
    });

    it("sends a fresh correlation id on every request", async () => {
      await api.get("/ping");
      await api.get("/ping");

      const ids = mock.history.get.map((req) => sentHeaders(req)["X-Correlation-Id"]);
      expect(ids).toHaveLength(2);
      expect(new Set(ids).size).toBe(2);
    });

    it("omits authorization when no token", async () => {
      await api.get("/ping");

      expect(sentHeaders(mock.history.get[0])).not.toHaveProperty("Authorization");
    });

    it("never sends X-Warehouse-Id", async () => {
      setAccessToken("tok-123");
      await api.get("/ping");

      expect(
        Object.keys(sentHeaders(mock.history.get[0])).map((name) => name.toLowerCase()),
      ).not.toContain("x-warehouse-id");
    });

    it("keeps an authorization header the caller set explicitly", async () => {
      setAccessToken("memory-token");
      await api.get("/ping", { headers: { Authorization: "Bearer explicit-token" } });

      expect(sentHeaders(mock.history.get[0]).Authorization).toBe("Bearer explicit-token");
    });

    it("does not attach the memory token to login", async () => {
      // Spring's bearer filter rejects an expired token even on a public endpoint, so a re-login
      // with a stale token still in memory would fail with 401.
      setAccessToken("stale-token");
      mock.onPost(AUTH_ENDPOINTS.login).reply(200, { success: true, data: {} });
      await api.post(AUTH_ENDPOINTS.login, { username: "u", password: "p" });

      expect(sentHeaders(mock.history.post[0])).not.toHaveProperty("Authorization");
    });
  });

  describe("response", () => {
    it("unwraps success envelope", async () => {
      mock.onGet("/items").reply(200, { success: true, data: { a: 1 } });

      const res = await api.get<unknown>("/items");

      expect(res.data).toEqual({ a: 1 });
    });

    it("leaves a body that is not an envelope untouched", async () => {
      mock.onGet("/raw").reply(200, { a: 1 });

      const res = await api.get<unknown>("/raw");

      expect(res.data).toEqual({ a: 1 });
    });

    it("normalizes error envelope", async () => {
      mock.onGet("/items").reply(400, {
        success: false,
        errorCode: "VALIDATION_FAILED",
        message: "x",
        fieldErrors: [{ field: "sku", message: "m", code: "C" }],
        correlationId: "cid",
      });

      const error = await rejection(api.get("/items"));

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 400,
        code: "VALIDATION_FAILED",
        message: "x",
        fieldErrors: { sku: "m" },
        fieldCodes: { sku: "C" },
        traceId: "cid",
      });
    });

    it("network error becomes NETWORK_ERROR status 0", async () => {
      mock.onGet("/items").networkError();

      const error = await rejection(api.get("/items"));

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
    });

    it("timeout becomes NETWORK_ERROR status 0", async () => {
      mock.onGet("/items").timeout();

      const error = await rejection(api.get("/items"));

      expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
    });
  });

  describe("401", () => {
    it("401 on business endpoint calls unauthorized handler", async () => {
      const handler = jest.fn();
      setUnauthorizedHandler(handler);
      mock.onGet("/orders").reply(401, { success: false, errorCode: "UNAUTHORIZED", message: "x" });

      const error = await rejection(api.get("/orders"));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(error, null);
      expect(error).toMatchObject({ status: 401, code: "UNAUTHORIZED" });
    });

    it("tells the handler which bearer token the failed request carried", async () => {
      const handler = jest.fn();
      setUnauthorizedHandler(handler);
      setAccessToken("tok-old");
      // The token in memory changes while the request is in flight (a re-login): the handler must
      // hear about the token that request was sent with, not the current one.
      mock.onGet("/orders").reply(() => {
        setAccessToken("tok-new");
        return [401, { success: false, errorCode: "UNAUTHORIZED" }];
      });

      const error = await rejection(api.get("/orders"));

      expect(handler).toHaveBeenCalledWith(error, "tok-old");
    });

    it("reports a bearer token the caller set itself", async () => {
      const handler = jest.fn();
      setUnauthorizedHandler(handler);
      setAccessToken("tok-memory");
      mock.onGet("/orders").reply(401, { success: false });

      const error = await rejection(
        api.get("/orders", { headers: { Authorization: "Bearer tok-explicit" } }),
      );

      expect(handler).toHaveBeenCalledWith(error, "tok-explicit");
    });

    it("401 on a path that merely starts with the me endpoint calls the handler", async () => {
      const handler = jest.fn();
      setUnauthorizedHandler(handler);
      mock.onGet(`${AUTH_ENDPOINTS.me}/permissions`).reply(401, { success: false });

      await rejection(api.get(`${AUTH_ENDPOINTS.me}/permissions`));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["login", AUTH_ENDPOINTS.login, "post"],
      ["me", AUTH_ENDPOINTS.me, "get"],
      ["logout", AUTH_ENDPOINTS.logout, "post"],
    ] as const)("401 on %s does not call the handler", async (_name, url, method) => {
      const handler = jest.fn();
      setUnauthorizedHandler(handler);
      mock.onAny(url).reply(401, { success: false, errorCode: "UNAUTHORIZED", message: "x" });

      const error = await rejection(api[method](url));

      expect(handler).not.toHaveBeenCalled();
      expect(error).toMatchObject({ status: 401 });
    });

    it("401 on me with a query string does not call the handler", async () => {
      const handler = jest.fn();
      setUnauthorizedHandler(handler);
      mock.onGet(`${AUTH_ENDPOINTS.me}?probe=1`).reply(401, { success: false });

      const error = await rejection(api.get(`${AUTH_ENDPOINTS.me}?probe=1`));

      expect(error).toMatchObject({ status: 401 });
      expect(handler).not.toHaveBeenCalled();
    });

    it("other statuses do not call the handler", async () => {
      const handler = jest.fn();
      setUnauthorizedHandler(handler);
      mock.onGet("/orders").reply(403, { success: false, errorCode: "FORBIDDEN" });

      await rejection(api.get("/orders"));

      expect(handler).not.toHaveBeenCalled();
    });

    it("still rejects with the ApiError when no handler is set", async () => {
      mock.onGet("/orders").reply(401, { success: false, errorCode: "UNAUTHORIZED" });

      const error = await rejection(api.get("/orders"));

      expect(error).toMatchObject({ status: 401, code: "UNAUTHORIZED" });
    });
  });

  describe("429", () => {
    it("429 exposes retry-after seconds", async () => {
      mock
        .onGet("/orders")
        .reply(
          429,
          { success: false, errorCode: "RATE_LIMITED", message: "x" },
          { "retry-after": "30" },
        );

      const error = await rejection(api.get("/orders"));

      expect(error).toMatchObject({ status: 429, code: "RATE_LIMITED" });
      expect(getRetryAfterSeconds(error)).toBe(30);
    });

    it("reads the header whatever its casing", async () => {
      mock.onGet("/orders").reply(429, { success: false }, { "Retry-After": "7" });

      const error = await rejection(api.get("/orders"));

      expect(getRetryAfterSeconds(error)).toBe(7);
    });

    it("has no retry-after when the header is absent", async () => {
      mock.onGet("/orders").reply(429, { success: false });

      const error = await rejection(api.get("/orders"));

      expect(getRetryAfterSeconds(error)).toBeNull();
    });
  });
});
