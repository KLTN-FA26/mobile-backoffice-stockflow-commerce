// In-memory stand-in for `expo-secure-store` (registered in src/test/setup.ts).
const data = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  return data.get(key) ?? null;
}

export async function setItemAsync(key: string, value: string, _options?: unknown): Promise<void> {
  data.set(key, value);
}

export async function deleteItemAsync(key: string, _options?: unknown): Promise<void> {
  data.delete(key);
}

/** Test-only: empties the store. `src/test/setup.ts` calls it after every test. */
export function __clear(): void {
  data.clear();
}
