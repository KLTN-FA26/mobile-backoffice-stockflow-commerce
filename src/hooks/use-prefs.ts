/**
 * Personal preferences of one screen, kept in the key-value store (`usePageConfig` of the web, on
 * `kv` instead of localStorage).
 *
 * Reads once, synchronously, when the component mounts: the first render already has the stored
 * value, so the screen never flashes the default. Writes only when a setter is called, never on
 * mount. Stored JSON that is broken, or that `merge` cannot take, means the default.
 */

import { useCallback, useRef, useState } from "react";

import { kv } from "@/lib/platform/storage";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readConfig<T>(
  key: string,
  defaultConfig: T,
  merge: (stored: Partial<T>, fallback: T) => T,
): T {
  try {
    const raw = kv.get(key);
    if (raw === null) return defaultConfig;
    const parsed: unknown = JSON.parse(raw);
    // `Partial<T>` is an object: anything else that parses (a number, a string, null) is not a config.
    if (!isRecord(parsed)) return defaultConfig;
    return merge(parsed as Partial<T>, defaultConfig);
  } catch {
    return defaultConfig;
  }
}

/**
 * @param key - the full storage key, from `MOBILE_STORAGE_KEYS.prefs(screen)`; constant for the
 *   life of the component
 * @param defaultConfig - what to use when nothing (valid) is stored
 * @param merge - folds the stored value, which may lack fields, into the default
 */
export function usePrefs<T>(
  key: string,
  defaultConfig: T,
  merge: (stored: Partial<T>, fallback: T) => T,
) {
  const [config, setConfigState] = useState<T>(() => readConfig(key, defaultConfig, merge));
  // The latest value, updated at once by a setter: two `updateConfig` calls in one tick compose.
  const latest = useRef(config);

  const setConfig = useCallback(
    (value: T) => {
      latest.current = value;
      setConfigState(value);
      try {
        kv.set(key, JSON.stringify(value));
      } catch {
        // A preference is not worth a crash: if the write fails, the value still holds for this session.
      }
    },
    [key],
  );

  const updateConfig = useCallback(
    (update: (current: T) => T) => setConfig(update(latest.current)),
    [setConfig],
  );

  return { config, setConfig, updateConfig };
}
