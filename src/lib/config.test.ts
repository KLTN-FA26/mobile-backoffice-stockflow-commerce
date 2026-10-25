import { readAppConfig } from "./config";

import type * as ConfigModule from "./config";

describe("readAppConfig", () => {
  it("reports a missing url", () => {
    expect(readAppConfig({})).toEqual({ ok: false, reason: "missing" });
    expect(readAppConfig({ EXPO_PUBLIC_API_URL: undefined })).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("treats an empty or blank url as missing", () => {
    expect(readAppConfig({ EXPO_PUBLIC_API_URL: "" })).toEqual({ ok: false, reason: "missing" });
    expect(readAppConfig({ EXPO_PUBLIC_API_URL: "   " })).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("reports an invalid url", () => {
    expect(readAppConfig({ EXPO_PUBLIC_API_URL: "abc" })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("rejects a url without http scheme", () => {
    // `new URL("localhost:8080/api/v1")` parses with the scheme "localhost:".
    expect(readAppConfig({ EXPO_PUBLIC_API_URL: "localhost:8080/api/v1" })).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(readAppConfig({ EXPO_PUBLIC_API_URL: "10.0.2.2:8080/api/v1" })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("rejects ftp", () => {
    expect(readAppConfig({ EXPO_PUBLIC_API_URL: "ftp://files.example.com/api/v1" })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it.each(["javascript:alert(1)", "mailto:ops@example.com"])("rejects %s", (url) => {
    expect(readAppConfig({ EXPO_PUBLIC_API_URL: url })).toEqual({ ok: false, reason: "invalid" });
  });

  it("accepts https", () => {
    expect(readAppConfig({ EXPO_PUBLIC_API_URL: "https://api.example.com/api/v1" })).toEqual({
      ok: true,
      apiUrl: "https://api.example.com/api/v1",
    });
  });

  it("accepts a valid url unchanged", () => {
    expect(readAppConfig({ EXPO_PUBLIC_API_URL: "http://10.0.2.2:8080/api/v1" })).toEqual({
      ok: true,
      apiUrl: "http://10.0.2.2:8080/api/v1",
    });
  });

  it("strips trailing slash", () => {
    expect(readAppConfig({ EXPO_PUBLIC_API_URL: "http://10.0.2.2:8080/api/v1/" })).toEqual({
      ok: true,
      apiUrl: "http://10.0.2.2:8080/api/v1",
    });
  });
});

describe("APP_CONFIG", () => {
  const original = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = original;
    jest.resetModules();
  });

  it("is read from the EXPO_PUBLIC_API_URL variable", () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.example.com/api/v1/";
    jest.resetModules();
    const { APP_CONFIG } = jest.requireActual<typeof ConfigModule>("./config");
    expect(APP_CONFIG).toEqual({ ok: true, apiUrl: "https://api.example.com/api/v1" });
  });

  it("is missing when the variable is not set", () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    jest.resetModules();
    const { APP_CONFIG } = jest.requireActual<typeof ConfigModule>("./config");
    expect(APP_CONFIG).toEqual({ ok: false, reason: "missing" });
  });
});
