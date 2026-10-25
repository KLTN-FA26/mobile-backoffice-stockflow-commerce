import type { ApiError } from "./error";

// `ApiError` stays a verbatim copy of the web class, so the 429 delay lives beside it instead of on
// it. Keyed by instance: the value dies with the error and nothing leaks across errors.
const retryAfterByError = new WeakMap<object, number>();

const DELAY_SECONDS = /^\d+$/;
// IMF-fixdate, RFC 850 and asctime all spell out a day and month name, which is what tells an
// HTTP-date from a malformed number that `Date.parse` would still read leniently ("1.5", "-5").
const HAS_LETTER = /[a-z]/i;

function parseSeconds(header: string, now: number): number | null {
  const value = header.trim();
  if (DELAY_SECONDS.test(value)) {
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) ? seconds : null;
  }
  if (!HAS_LETTER.test(value)) return null;
  const at = Date.parse(value);
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.ceil((at - now) / 1000));
}

/**
 * Remembers the `Retry-After` of a failed response on its `ApiError`: whole seconds, or an
 * HTTP-date turned into seconds from now (rounded up, never negative). A missing or unreadable
 * header clears any earlier value.
 */
export function rememberRetryAfter(error: ApiError, header: string | undefined): void {
  const seconds = header === undefined ? null : parseSeconds(header, Date.now());
  if (seconds === null) retryAfterByError.delete(error);
  else retryAfterByError.set(error, seconds);
}

/** Seconds to wait before retrying, or null when the response carried no usable `Retry-After`. */
export function getRetryAfterSeconds(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  return retryAfterByError.get(error) ?? null;
}
