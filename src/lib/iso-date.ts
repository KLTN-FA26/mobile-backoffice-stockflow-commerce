/**
 * `YYYY-MM-DD` calendar dates (the form dates take in props and in the API) against the `Date`
 * objects native date pickers speak.
 *
 * A picker works in the phone's local time, so a day is built and read back through local fields
 * only: `new Date("2026-03-15")` is midnight UTC and could read back as the 14th. Noon keeps the
 * day the same across a daylight-saving shift.
 */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The day at noon, local time; `null` for anything that is not an existing `YYYY-MM-DD` day. */
export function isoToLocalDate(iso: string): Date | null {
  const match = ISO_DATE.exec(iso);
  if (match === null) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day, 12);
  // `new Date(2026, 1, 31)` rolls over to March, and years under 100 map to the 1900s: neither
  // reads back as the day that was asked for.
  const exists =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return exists ? date : null;
}

export function localDateToIso(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** `date` pulled into `[min, max]`; either end may be left out. */
export function clampDate(date: Date, min: Date | undefined, max: Date | undefined): Date {
  if (min !== undefined && date < min) return min;
  if (max !== undefined && date > max) return max;
  return date;
}
