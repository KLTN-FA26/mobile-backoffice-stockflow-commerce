import { SESSION_LIMITS } from "@/constants/mobile";

import {
  SESSION_PREFIX,
  sessionClearAll,
  sessionGet,
  sessionRemove,
  sessionSet,
} from "./session-store";
import { kv } from "./storage";

const TTL = SESSION_LIMITS.sessionDataTtlMs;

describe("session store", () => {
  afterEach(() => {
    kv.keys().forEach((key) => kv.remove(key));
  });

  it("namespaces keys with session:", () => {
    expect(SESSION_PREFIX).toBe("session:");
    sessionSet("request-id", "r1");
    expect(kv.keys()).toEqual(["session:request-id"]);
  });

  it("returns stored value before ttl", () => {
    const now = 1_000_000;
    sessionSet("request-id", { id: "r1", lines: [1, 2] }, now);
    expect(sessionGet("request-id", now)).toEqual({ id: "r1", lines: [1, 2] });
    expect(sessionGet("request-id", now + TTL)).toEqual({ id: "r1", lines: [1, 2] });
  });

  it("returns null after 24h", () => {
    const now = 1_000_000;
    sessionSet("request-id", "r1", now);
    expect(sessionGet("request-id", now + 24 * 60 * 60_000 + 1)).toBeNull();
  });

  it("deletes an entry once it has expired", () => {
    const now = 1_000_000;
    sessionSet("request-id", "r1", now);
    sessionGet("request-id", now + TTL + 1);
    expect(kv.get("session:request-id")).toBeNull();
  });

  it("returns null for a missing key", () => {
    expect(sessionGet("missing")).toBeNull();
  });

  it("deletes corrupt json and returns null", () => {
    kv.set("session:broken", "{not json");
    expect(sessionGet("broken")).toBeNull();
    expect(kv.get("session:broken")).toBeNull();
  });

  it("deletes an entry that is valid json but not a session envelope", () => {
    kv.set("session:odd", JSON.stringify({ hello: "world" }));
    expect(sessionGet("odd")).toBeNull();
    expect(kv.get("session:odd")).toBeNull();
  });

  it("keeps a stored falsy value", () => {
    sessionSet("flag", false);
    sessionSet("zero", 0);
    expect(sessionGet("flag")).toBe(false);
    expect(sessionGet("zero")).toBe(0);
  });

  it("removes one key", () => {
    sessionSet("a", 1);
    sessionSet("b", 2);
    sessionRemove("a");
    expect(sessionGet("a")).toBeNull();
    expect(sessionGet("b")).toBe(2);
  });

  it("clearAll removes only session: keys", () => {
    kv.set("stockflow-app", '{"state":{}}');
    kv.set("stockflow:orders:config", "{}");
    sessionSet("a", 1);
    sessionSet("b", 2);

    sessionClearAll();

    expect([...kv.keys()].sort()).toEqual(["stockflow-app", "stockflow:orders:config"]);
    expect(kv.get("stockflow-app")).toBe('{"state":{}}');
  });
});
