import { ApiError } from "./error";
import { getRetryAfterSeconds, rememberRetryAfter } from "./retry-after";

const NOW = Date.parse("2026-10-25T00:00:00.000Z");

function rateLimited(): ApiError {
  return new ApiError(429, "RATE_LIMITED", "Too many requests");
}

function read(header: string | undefined): number | null {
  const error = rateLimited();
  rememberRetryAfter(error, header);
  return getRetryAfterSeconds(error);
}

describe("retry-after", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("reads whole seconds", () => {
    expect(read("30")).toBe(30);
    expect(read("0")).toBe(0);
    expect(read(" 12 ")).toBe(12);
  });

  it("converts an HTTP-date to seconds from now", () => {
    expect(read("Sun, 25 Oct 2026 00:00:30 GMT")).toBe(30);
  });

  it("rounds an HTTP-date up to the next whole second", () => {
    jest.setSystemTime(NOW + 500);
    expect(read("Sun, 25 Oct 2026 00:00:30 GMT")).toBe(30);
  });

  it("clamps an HTTP-date in the past to zero", () => {
    expect(read("Sat, 24 Oct 2026 23:59:00 GMT")).toBe(0);
  });

  it("returns null without a usable header", () => {
    expect(read(undefined)).toBeNull();
    expect(read("")).toBeNull();
    expect(read("   ")).toBeNull();
    expect(read("soon")).toBeNull();
    expect(read("-5")).toBeNull();
    expect(read("1.5")).toBeNull();
    expect(read("99999999999999999999")).toBeNull();
  });

  it("returns null for an error that never went through the client", () => {
    expect(getRetryAfterSeconds(rateLimited())).toBeNull();
  });

  it("returns null for values that are not ApiError instances", () => {
    expect(getRetryAfterSeconds(null)).toBeNull();
    expect(getRetryAfterSeconds(undefined)).toBeNull();
    expect(getRetryAfterSeconds("30")).toBeNull();
    expect(getRetryAfterSeconds(new Error("x"))).toBeNull();
  });

  it("keeps the value per error instance", () => {
    const first = rateLimited();
    const second = rateLimited();
    rememberRetryAfter(first, "5");
    rememberRetryAfter(second, "9");
    expect(getRetryAfterSeconds(first)).toBe(5);
    expect(getRetryAfterSeconds(second)).toBe(9);
  });

  it("forgets an earlier value when the header is absent on a later call", () => {
    const error = rateLimited();
    rememberRetryAfter(error, "5");
    rememberRetryAfter(error, undefined);
    expect(getRetryAfterSeconds(error)).toBeNull();
  });
});
