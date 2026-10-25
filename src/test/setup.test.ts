import MockAdapter from "axios-mock-adapter";
import * as SecureStore from "expo-secure-store";
import Storage from "expo-sqlite/kv-store";

import { api, setUnauthorizedHandler } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { getAccessToken, setAccessToken } from "@/lib/auth/token-store";

import type { AuthUser } from "@/lib/auth/auth-store";

const USER: AuthUser = {
  userId: "u-leak",
  username: "leak",
  email: "leak@stockflow.vn",
  fullName: null,
  status: "ACTIVE",
  roles: [],
  lastLoginAt: null,
};

const http = new MockAdapter(api);
const leakedHandler = jest.fn();

afterAll(() => http.restore());

// The two tests run in order: the first leaves a whole session behind, the second proves that the
// global afterEach in setup.ts wiped it.
describe("global test cleanup", () => {
  it("a test may leave a session behind", async () => {
    useAuthStore.getState().login(USER, Date.now() + 60_000);
    setAccessToken("leaked-token");
    setUnauthorizedHandler(leakedHandler);
    await SecureStore.setItemAsync("leaked-secure", "1");
    Storage.setItemSync("session:leaked", "1");

    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("the next test starts signed out with empty stores and no 401 handler", async () => {
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      status: "unknown",
      authorizationVersion: 0,
      sessionExpiresAt: null,
      sessionExpired: false,
    });
    expect(getAccessToken()).toBeNull();
    expect(await SecureStore.getItemAsync("leaked-secure")).toBeNull();
    expect(Storage.getAllKeysSync()).toEqual([]);

    http.onGet("/orders").reply(401);
    await expect(api.get("/orders")).rejects.toMatchObject({ status: 401 });
    expect(leakedHandler).not.toHaveBeenCalled();
  });
});
