import MockAdapter from "axios-mock-adapter";
import { ZodError } from "zod";

import { AUTH_ENDPOINTS } from "@/constants/mobile";

import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error";

import { sentHeaders } from "@/test/request-headers";

import { fetchMe, loginRequest, logoutRequest } from "./auth-api";
import { setAccessToken } from "./token-store";

jest.mock("@/lib/config", () => ({
  APP_CONFIG: { ok: true, apiUrl: "https://api.test/api/v1" },
}));
jest.mock("@/lib/platform/user-agent", () => ({
  deviceUserAgent: () => "StockFlowMobile/0.1.0 (Android 14; Pixel 7)",
}));

const mock = new MockAdapter(api);

const TOKEN = { accessToken: "tok-123", tokenType: "Bearer", expiresInSeconds: 3600 };
const ME = {
  userId: "u-1",
  username: "alice",
  email: "alice@stockflow.vn",
  status: "ACTIVE",
  roles: ["WAREHOUSE_STAFF"],
};

describe("auth api", () => {
  afterEach(() => {
    mock.reset();
    setAccessToken(null);
  });

  describe("loginRequest", () => {
    it("login posts credentials and parses token", async () => {
      mock.onPost(AUTH_ENDPOINTS.login).reply(200, { success: true, data: TOKEN });

      const token = await loginRequest({ username: "alice", password: "s3cret" });

      expect(token).toEqual(TOKEN);
      expect(mock.history.post).toHaveLength(1);
      expect(JSON.parse(String(mock.history.post[0]?.data))).toEqual({
        username: "alice",
        password: "s3cret",
      });
    });

    it("trims the username before sending", async () => {
      mock.onPost(AUTH_ENDPOINTS.login).reply(200, { success: true, data: TOKEN });

      await loginRequest({ username: "  alice ", password: "s3cret" });

      expect(JSON.parse(String(mock.history.post[0]?.data))).toMatchObject({ username: "alice" });
    });

    it("does not call the backend with invalid credentials", async () => {
      await expect(loginRequest({ username: "  ", password: "x" })).rejects.toBeInstanceOf(
        ZodError,
      );
      expect(mock.history.post).toHaveLength(0);
    });

    it("login rejects malformed token response", async () => {
      mock.onPost(AUTH_ENDPOINTS.login).reply(200, { success: true, data: { accessToken: "" } });

      await expect(loginRequest({ username: "alice", password: "s3cret" })).rejects.toBeInstanceOf(
        ZodError,
      );
    });

    it.each([
      ["a missing token", { ...TOKEN, accessToken: undefined }],
      ["an empty token", { ...TOKEN, accessToken: "" }],
      ["another token type", { ...TOKEN, tokenType: "Basic" }],
      ["a zero lifetime", { ...TOKEN, expiresInSeconds: 0 }],
      ["a fractional lifetime", { ...TOKEN, expiresInSeconds: 1.5 }],
      ["a lifetime sent as text", { ...TOKEN, expiresInSeconds: "3600" }],
    ])("login rejects %s", async (_name, data) => {
      mock.onPost(AUTH_ENDPOINTS.login).reply(200, { success: true, data });

      await expect(loginRequest({ username: "alice", password: "s3cret" })).rejects.toBeInstanceOf(
        ZodError,
      );
    });

    it("surfaces a failed login as ApiError", async () => {
      mock
        .onPost(AUTH_ENDPOINTS.login)
        .reply(401, { success: false, errorCode: "UNAUTHORIZED", message: "x" });

      const failure = loginRequest({ username: "alice", password: "wrong" });

      await expect(failure).rejects.toBeInstanceOf(ApiError);
      await expect(failure).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" });
    });
  });

  describe("fetchMe", () => {
    it("fetchMe parses user and normalizes missing fullName to null", async () => {
      mock.onGet(AUTH_ENDPOINTS.me).reply(200, { success: true, data: ME });

      const user = await fetchMe();

      expect(user).toEqual({ ...ME, fullName: null, lastLoginAt: null });
    });

    it("keeps fullName and lastLoginAt when present", async () => {
      const data = { ...ME, fullName: "Alice Nguyen", lastLoginAt: "2026-10-24T08:00:00Z" };
      mock.onGet(AUTH_ENDPOINTS.me).reply(200, { success: true, data });

      expect(await fetchMe()).toEqual(data);
    });

    it("rejects a user payload that breaks the contract", async () => {
      mock.onGet(AUTH_ENDPOINTS.me).reply(200, { success: true, data: { userId: "u-1" } });

      await expect(fetchMe()).rejects.toBeInstanceOf(ZodError);
    });

    it("sends the memory token and honours the abort signal", async () => {
      setAccessToken("tok-123");
      mock.onGet(AUTH_ENDPOINTS.me).reply(200, { success: true, data: ME });
      const controller = new AbortController();

      await fetchMe(controller.signal);

      expect(sentHeaders(mock.history.get[0]).Authorization).toBe("Bearer tok-123");
      expect(mock.history.get[0]?.signal).toBe(controller.signal);
    });
  });

  describe("logoutRequest", () => {
    it("posts to logout with the memory token", async () => {
      setAccessToken("memory-token");
      mock.onPost(AUTH_ENDPOINTS.logout).reply(200, { success: true, data: null });

      await expect(logoutRequest()).resolves.toBeUndefined();

      expect(sentHeaders(mock.history.post[0]).Authorization).toBe("Bearer memory-token");
    });

    it("logout with explicit token uses that bearer", async () => {
      setAccessToken("memory-token");
      mock.onPost(AUTH_ENDPOINTS.logout).reply(200, { success: true, data: null });

      await logoutRequest("explicit-token");

      expect(sentHeaders(mock.history.post[0]).Authorization).toBe("Bearer explicit-token");
    });

    it("rejects when the backend refuses, leaving best-effort handling to the caller", async () => {
      mock.onPost(AUTH_ENDPOINTS.logout).reply(401, { success: false, errorCode: "UNAUTHORIZED" });

      await expect(logoutRequest("stale")).rejects.toMatchObject({ status: 401 });
    });
  });
});
