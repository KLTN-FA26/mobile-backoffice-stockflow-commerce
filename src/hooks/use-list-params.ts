/**
 * List filters in the route params — `useUrlFilters` of the web (nuqs) on Expo Router.
 *
 * Reading: `useLocalSearchParams`. Writing: `router.setParams`, which changes the current route
 * without adding history. An array is one comma-joined string (`?status=A,B`), as nuqs writes it,
 * so its items must not contain a comma. A key the route does not have reads as its default; a
 * value written equal to its default is taken out of the route again, so the route stays minimal.
 * Infinite scroll replaces the web's `page`, so nothing here resets it.
 */

import { router, useLocalSearchParams } from "expo-router";

import { UI_LIMITS } from "@/constants/mobile";

import { useDebouncedValue } from "./use-debounced-value";

type ParamValue = string | string[];
type ParamDefaults = Record<string, ParamValue>;
type RouteValue = string | string[] | undefined;
type RouteUpdate = Record<string, string | undefined>;

const ARRAY_SEPARATOR = ",";
/** The search box. It is debounced, and it is not a filter chip. */
const SEARCH_KEY = "q";
/** The sort order. Sorting is not filtering: it has its own control and is not counted. */
const SORT_KEY = "sort";
const NOT_FILTER_KEYS: ReadonlySet<string> = new Set([SEARCH_KEY, SORT_KEY]);

export type ListParamsResult<T extends ParamDefaults> = {
  params: T;
  /** `q` after `UI_LIMITS.searchDebounceMs` without a change: what to send to the backend. */
  debouncedQ: string;
  setParam<K extends keyof T>(key: K, value: T[K]): void;
  /** Several keys in one navigation update. */
  setParams(values: Partial<T>): void;
  /** Every key back to its default. */
  reset(): void;
  /** How many keys other than `q` and `sort` differ from their default. */
  activeFilterCount: number;
};

function serialize(value: ParamValue): string {
  return Array.isArray(value) ? value.join(ARRAY_SEPARATOR) : value;
}

function readValue(raw: RouteValue, fallback: ParamValue): ParamValue {
  if (raw === undefined) return fallback;
  if (Array.isArray(fallback)) {
    // Expo Router hands a repeated key (`?s=A&s=B`) over as an array; each part may hold commas too.
    const parts = Array.isArray(raw) ? raw : [raw];
    return parts.flatMap((part) => part.split(ARRAY_SEPARATOR)).filter((item) => item !== "");
  }
  return Array.isArray(raw) ? (raw[0] ?? fallback) : raw;
}

function toRouteUpdate(values: Partial<ParamDefaults>, defaults: ParamDefaults): RouteUpdate {
  const update: RouteUpdate = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const text = serialize(value);
    // `undefined` removes the key. An empty value must stay in the route when the default is not
    // empty, or clearing a pre-filled filter would bring the default straight back.
    update[key] = text === serialize(defaults[key]) ? undefined : text;
  }
  return update;
}

/**
 * `activeFilterCount` is the filter chips (every key but `q` and `sort`); the search text is
 * separate. A screen picks its empty state with
 * `hasActiveFilters = activeFilterCount > 0 || params.q !== ""`.
 *
 * @param defaults - every key the screen reads, with its default; also tells an array key from a
 *   string key. Pass a module-level constant, not a literal built on each render.
 */
export function useListParams<T extends ParamDefaults>(defaults: T): ListParamsResult<T> {
  const route: Record<string, RouteValue> = useLocalSearchParams();
  const entries = Object.entries(defaults).map(([key, fallback]) => [
    key,
    readValue(route[key], fallback),
  ]);
  // Same keys as `defaults`, each read as the type of its default.
  const params = Object.fromEntries(entries) as T;

  const search: ParamValue | undefined = params[SEARCH_KEY];
  const debouncedQ = useDebouncedValue(
    typeof search === "string" ? search : "",
    UI_LIMITS.searchDebounceMs,
  );

  const activeFilterCount = Object.keys(defaults).filter(
    (key) => !NOT_FILTER_KEYS.has(key) && serialize(params[key]) !== serialize(defaults[key]),
  ).length;

  const write = (values: Partial<ParamDefaults>) =>
    router.setParams(toRouteUpdate(values, defaults));
  const setParams = (values: Partial<T>) => write(values);
  const setParam = <K extends keyof T>(key: K, value: T[K]) => write({ [String(key)]: value });
  const reset = () =>
    router.setParams(Object.fromEntries(Object.keys(defaults).map((key) => [key, undefined])));

  return { params, debouncedQ, setParam, setParams, reset, activeFilterCount };
}
