import * as SecureStore from "expo-secure-store";

import { MOBILE_STORAGE_KEYS } from "@/constants/mobile";

import {
  clearSession,
  forgetStoredSession,
  getAccessToken,
  loadSession,
  persistSession,
  setAccessToken,
} from "./token-store";

import type { StoredSession } from "./token-store";

const KEY = MOBILE_STORAGE_KEYS.secureSession;
const NOW = 1_700_000_000_000;

describe("token store", () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await clearSession();
  });

  it("keeps the active token in memory", () => {
    expect(getAccessToken()).toBeNull();
    setAccessToken("abc");
    expect(getAccessToken()).toBe("abc");
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });

  it("persist then load returns session", async () => {
    const session = { accessToken: "abc", expiresAt: NOW + 60_000 };
    await persistSession(session);
    expect(await loadSession(NOW)).toEqual(session);
  });

  it("persists under the secure session key", async () => {
    await persistSession({ accessToken: "abc", expiresAt: NOW + 60_000 });
    expect(JSON.parse((await SecureStore.getItemAsync(KEY)) ?? "null")).toEqual({
      accessToken: "abc",
      expiresAt: NOW + 60_000,
    });
  });

  it("loads null when nothing is stored", async () => {
    expect(await loadSession(NOW)).toBeNull();
  });

  it("expired session loads as null", async () => {
    await persistSession({ accessToken: "abc", expiresAt: NOW - 1 });
    expect(await loadSession(NOW)).toBeNull();
  });

  it("a session expiring right now is expired", async () => {
    await persistSession({ accessToken: "abc", expiresAt: NOW });
    expect(await loadSession(NOW)).toBeNull();
  });

  it("corrupt json is deleted", async () => {
    await SecureStore.setItemAsync(KEY, "{not json");
    expect(await loadSession(NOW)).toBeNull();
    expect(await SecureStore.getItemAsync(KEY)).toBeNull();
  });

  it.each([
    ["wrong shape", JSON.stringify({ token: "abc" })],
    ["empty token", JSON.stringify({ accessToken: "", expiresAt: NOW + 60_000 })],
    ["non-numeric expiry", JSON.stringify({ accessToken: "abc", expiresAt: "tomorrow" })],
  ])("%s is deleted", async (_name, raw) => {
    await SecureStore.setItemAsync(KEY, raw);
    expect(await loadSession(NOW)).toBeNull();
    expect(await SecureStore.getItemAsync(KEY)).toBeNull();
  });

  it("rejected read returns null and attempts delete", async () => {
    await persistSession({ accessToken: "abc", expiresAt: NOW + 60_000 });
    jest.spyOn(SecureStore, "getItemAsync").mockRejectedValueOnce(new Error("cannot decrypt"));
    const deleteItem = jest.spyOn(SecureStore, "deleteItemAsync");

    await expect(loadSession(NOW)).resolves.toBeNull();

    expect(deleteItem).toHaveBeenCalledWith(KEY);
    expect(await SecureStore.getItemAsync(KEY)).toBeNull();
  });

  it("rejected read with a rejected delete still returns null", async () => {
    jest.spyOn(SecureStore, "getItemAsync").mockRejectedValueOnce(new Error("cannot decrypt"));
    jest.spyOn(SecureStore, "deleteItemAsync").mockRejectedValueOnce(new Error("keystore down"));

    await expect(loadSession(NOW)).resolves.toBeNull();
  });

  it("rejected delete during corrupt cleanup still returns null", async () => {
    await SecureStore.setItemAsync(KEY, "{not json");
    jest.spyOn(SecureStore, "deleteItemAsync").mockRejectedValueOnce(new Error("keystore down"));

    await expect(loadSession(NOW)).resolves.toBeNull();
  });

  it("persist stores only accessToken and expiresAt", async () => {
    const session: StoredSession & { refreshToken: string } = {
      accessToken: "abc",
      expiresAt: NOW + 60_000,
      refreshToken: "should-not-be-stored",
    };

    await persistSession(session);

    const stored: unknown = JSON.parse((await SecureStore.getItemAsync(KEY)) ?? "null");
    expect(stored).toEqual({ accessToken: "abc", expiresAt: NOW + 60_000 });
    expect(Object.keys(stored as object).sort()).toEqual(["accessToken", "expiresAt"]);
  });

  it.each([
    ["empty token", { accessToken: "", expiresAt: NOW + 60_000 }],
    ["non-finite expiry", { accessToken: "abc", expiresAt: Number.NaN }],
  ])("persist rejects an invalid session (%s) without writing", async (_name, session) => {
    await expect(persistSession(session)).rejects.toThrow(/invalid session/);
    expect(await SecureStore.getItemAsync(KEY)).toBeNull();
  });

  it("clear resolves even when delete rejects (memory token cleared)", async () => {
    setAccessToken("abc");
    jest.spyOn(SecureStore, "deleteItemAsync").mockRejectedValueOnce(new Error("keystore down"));

    await expect(clearSession()).resolves.toBeUndefined();

    expect(getAccessToken()).toBeNull();
  });

  it("forgetting a token deletes the stored session holding it, never the memory token", async () => {
    await persistSession({ accessToken: "tok-new", expiresAt: NOW + 60_000 });
    setAccessToken("tok-old");

    await forgetStoredSession("tok-new");

    expect(await SecureStore.getItemAsync(KEY)).toBeNull();
    expect(getAccessToken()).toBe("tok-old");
  });

  it("forgetting a token leaves another session's stored copy alone", async () => {
    const session = { accessToken: "tok-old", expiresAt: NOW + 60_000 };
    await persistSession(session);

    await forgetStoredSession("tok-new");

    expect(await loadSession(NOW)).toEqual(session);
  });

  it("forgetting a token never rejects, even when the keystore does", async () => {
    await persistSession({ accessToken: "tok-new", expiresAt: NOW + 60_000 });
    jest.spyOn(SecureStore, "deleteItemAsync").mockRejectedValueOnce(new Error("keystore down"));
    await expect(forgetStoredSession("tok-new")).resolves.toBeUndefined();

    jest.spyOn(SecureStore, "getItemAsync").mockRejectedValueOnce(new Error("cannot decrypt"));
    await expect(forgetStoredSession("tok-new")).resolves.toBeUndefined();
  });

  it("clear removes secure item and memory token", async () => {
    await persistSession({ accessToken: "abc", expiresAt: NOW + 60_000 });
    setAccessToken("abc");

    await clearSession();

    expect(await SecureStore.getItemAsync(KEY)).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(await loadSession(NOW)).toBeNull();
  });
});
