import { SESSION_LIMITS } from "@/constants/mobile";

import { kv } from "./storage";

/** Every temporary-session key (e.g. a `requestId`) lives under this prefix in the kv-store. */
export const SESSION_PREFIX = "session:";

type Envelope = { value: unknown; savedAt: number };

function isEnvelope(parsed: unknown): parsed is Envelope {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    "value" in parsed &&
    "savedAt" in parsed &&
    typeof parsed.savedAt === "number"
  );
}

/** Stores `value` with a 24h time-to-live (same as the backend idempotency window). */
export function sessionSet<T>(key: string, value: T, now = Date.now()): void {
  const envelope: Envelope = { value, savedAt: now };
  kv.set(SESSION_PREFIX + key, JSON.stringify(envelope));
}

/**
 * Returns the stored value, or null when it is missing, expired or unreadable (the latter two are
 * deleted). `T` is the caller's promise about what it stored: nothing re-validates the value, so
 * parse it with a schema if it will be trusted.
 */
export function sessionGet<T>(key: string, now = Date.now()): T | null {
  const storageKey = SESSION_PREFIX + key;
  const raw = kv.get(storageKey);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    kv.remove(storageKey);
    return null;
  }
  if (!isEnvelope(parsed) || now - parsed.savedAt > SESSION_LIMITS.sessionDataTtlMs) {
    kv.remove(storageKey);
    return null;
  }
  return parsed.value as T;
}

export function sessionRemove(key: string): void {
  kv.remove(SESSION_PREFIX + key);
}

/** Wipes the whole `session:` namespace (on logout); other kv keys are left alone. */
export function sessionClearAll(): void {
  kv.keys()
    .filter((key) => key.startsWith(SESSION_PREFIX))
    .forEach((key) => kv.remove(key));
}
