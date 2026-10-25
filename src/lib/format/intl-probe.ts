/**
 * Hermes `Intl` probe (mobile only — not part of the web port).
 *
 * The verbatim web formatters in this folder rely on `Intl` with `timeZone: "Asia/Ho_Chi_Minh"` and
 * `vi-VN`. Node (ICU 76) produces the expected strings below; Hermes on a phone may format
 * differently or throw. `runIntlProbe` runs every case on whatever engine it is called from, so
 * the dev screen can show the real device result next to the Node expectation.
 */
import {
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatFixed,
  formatMoney,
  formatNumber,
  formatPercent,
  formatTime,
  toLocalIsoDate,
} from "@/lib/format";

/** 17:30:05 UTC on 14 Mar — already 15 Mar 00:30:05 in Asia/Ho_Chi_Minh (UTC+7). */
export const INTL_PROBE_ISO = "2026-03-14T17:30:05Z";

export interface IntlProbeCase {
  name: string;
  run: () => string;
  expected: string;
}

export interface IntlProbeResult {
  name: string;
  actual: string;
  expected: string;
  ok: boolean;
}

export const INTL_PROBE_CASES: readonly IntlProbeCase[] = [
  {
    name: "formatDate(INTL_PROBE_ISO)",
    run: () => formatDate(INTL_PROBE_ISO),
    expected: "15 thg 3, 2026",
  },
  {
    name: "formatDateTime(INTL_PROBE_ISO)",
    run: () => formatDateTime(INTL_PROBE_ISO),
    expected: "00:30 15 thg 3, 2026",
  },
  {
    name: "formatTime(INTL_PROBE_ISO)",
    run: () => formatTime(INTL_PROBE_ISO),
    expected: "00:30:05",
  },
  {
    name: "toLocalIsoDate(INTL_PROBE_ISO)",
    run: () => toLocalIsoDate(INTL_PROBE_ISO),
    expected: "2026-03-15",
  },
  {
    name: 'formatMoney(1234567, "VND")',
    run: () => formatMoney(1234567, "VND"),
    expected: "1.234.567 ₫",
  },
  {
    name: "formatNumber(1234567.5)",
    run: () => formatNumber(1234567.5),
    expected: "1.234.567,5",
  },
  {
    name: "formatFixed(33.1966, 2)",
    run: () => formatFixed(33.1966, 2),
    expected: "33,20",
  },
  {
    name: "formatPercent(0.856)",
    run: () => formatPercent(0.856),
    expected: "85,6%",
  },
  {
    name: "formatCompactNumber(1500)",
    run: () => formatCompactNumber(1500),
    expected: "1,5 N",
  },
  {
    name: 'formatMoney(1234.5, "USD")',
    run: () => formatMoney(1234.5, "USD"),
    expected: "$1,234.50",
  },
];

/** ICU versions differ only in which space they emit (U+00A0 vs U+202F vs plain), so compare past it. */
function normalizeSpaces(value: string): string {
  return value.replace(/[  ]/g, " ");
}

function describeThrown(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Runs every case; a thrown error is reported as `THROW: <message>` and never escapes. */
export function runIntlProbe(
  cases: readonly IntlProbeCase[] = INTL_PROBE_CASES,
): IntlProbeResult[] {
  return cases.map(({ name, run, expected }) => {
    try {
      const actual = run();
      return { name, actual, expected, ok: normalizeSpaces(actual) === normalizeSpaces(expected) };
    } catch (error: unknown) {
      return { name, actual: `THROW: ${describeThrown(error)}`, expected, ok: false };
    }
  });
}
