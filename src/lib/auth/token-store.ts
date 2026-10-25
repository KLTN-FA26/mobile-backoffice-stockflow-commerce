import * as SecureStore from "expo-secure-store";
import { z } from "zod";

import { MOBILE_STORAGE_KEYS } from "@/constants/mobile";

const storedSessionSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.number().finite(),
});

export type StoredSession = z.infer<typeof storedSessionSchema>;

// The token in use lives in memory (read on every request); SecureStore only holds the copy that
// survives an app restart. Never kv-store, zustand persist or a log line.
let memoryToken: string | null = null;

export function getAccessToken(): string | null {
  return memoryToken;
}

export function setAccessToken(token: string | null): void {
  memoryToken = token;
}

/**
 * Writes `{ accessToken, expiresAt }` and nothing else, whatever extra fields the caller's object
 * carries. Callers build the session themselves, so an invalid one is a programming error: throw.
 */
export async function persistSession(session: StoredSession): Promise<void> {
  const parsed = storedSessionSchema.safeParse(session);
  if (!parsed.success) {
    throw new Error(
      "persistSession received an invalid session: accessToken must be a non-empty string and expiresAt a finite number",
    );
  }
  await SecureStore.setItemAsync(MOBILE_STORAGE_KEYS.secureSession, JSON.stringify(parsed.data));
}

function parseStoredSession(raw: string): StoredSession | null {
  try {
    const result = storedSessionSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// Best effort: a keystore that cannot delete must not break the caller's boot or logout chain.
async function deleteStoredSessionQuietly(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(MOBILE_STORAGE_KEYS.secureSession);
  } catch {
    // Nothing more to do: the item is unreadable anyway and the next login overwrites it.
  }
}

/**
 * Missing and expired load as null. An unreadable item (bad JSON, wrong shape, or a read the
 * keystore rejects, e.g. after a backup restore) also loads as null and is deleted. Never rejects.
 */
export async function loadSession(now = Date.now()): Promise<StoredSession | null> {
  let raw: string | null;
  try {
    raw = await SecureStore.getItemAsync(MOBILE_STORAGE_KEYS.secureSession);
  } catch {
    await deleteStoredSessionQuietly();
    return null;
  }
  if (raw === null) return null;

  const session = parseStoredSession(raw);
  if (session === null) {
    await deleteStoredSessionQuietly();
    return null;
  }
  return session.expiresAt > now ? session : null;
}

/** Clears the memory token first, then the stored copy. Never rejects, so logout always goes on. */
export async function clearSession(): Promise<void> {
  memoryToken = null;
  await deleteStoredSessionQuietly();
}
