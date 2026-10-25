import { INTL_PROBE_CASES, INTL_PROBE_ISO, runIntlProbe } from "./intl-probe";

import type { IntlProbeCase } from "./intl-probe";

describe("runIntlProbe", () => {
  it("every probe case passes on Node ICU", () => {
    const results = runIntlProbe();

    expect(results).toHaveLength(10);
    expect(results.map((result) => result.name)).toEqual(INTL_PROBE_CASES.map(({ name }) => name));
    expect(results.filter((result) => !result.ok)).toEqual([]);
  });

  it("probes the cases in the documented order with the verbatim expectations", () => {
    expect(INTL_PROBE_ISO).toBe("2026-03-14T17:30:05Z");
    expect(INTL_PROBE_CASES.map(({ name, expected }) => [name, expected])).toEqual([
      ["formatDate(INTL_PROBE_ISO)", "15 thg 3, 2026"],
      ["formatDateTime(INTL_PROBE_ISO)", "00:30 15 thg 3, 2026"],
      ["formatTime(INTL_PROBE_ISO)", "00:30:05"],
      ["toLocalIsoDate(INTL_PROBE_ISO)", "2026-03-15"],
      ['formatMoney(1234567, "VND")', "1.234.567 ₫"],
      ["formatNumber(1234567.5)", "1.234.567,5"],
      ["formatFixed(33.1966, 2)", "33,20"],
      ["formatPercent(0.856)", "85,6%"],
      ["formatCompactNumber(1500)", "1,5 N"],
      ['formatMoney(1234.5, "USD")', "$1,234.50"],
    ]);
  });

  it("a throwing case is reported, not thrown", () => {
    const cases: readonly IntlProbeCase[] = [
      {
        name: "boom",
        run: () => {
          throw new Error("RangeError: Incorrect locale information provided");
        },
        expected: "anything",
      },
    ];

    const [result] = runIntlProbe(cases);

    expect(result?.ok).toBe(false);
    expect(result?.actual).toBe("THROW: RangeError: Incorrect locale information provided");
    expect(result?.actual.startsWith("THROW: ")).toBe(true);
  });

  it("reports a thrown non-Error value instead of crashing", () => {
    const cases: readonly IntlProbeCase[] = [
      {
        name: "string throw",
        run: () => {
          throw "plain string";
        },
        expected: "anything",
      },
    ];

    const [result] = runIntlProbe(cases);

    expect(result).toMatchObject({ ok: false, actual: "THROW: plain string" });
  });

  it("nbsp differences are ignored", () => {
    const cases: readonly IntlProbeCase[] = [
      { name: "nbsp", run: () => "1 ₫", expected: "1 ₫" },
      { name: "narrow nbsp", run: () => "1 ₫", expected: "1 ₫" },
      { name: "nbsp on the expected side", run: () => "1 ₫", expected: "1 ₫" },
    ];

    expect(runIntlProbe(cases).map((result) => result.ok)).toEqual([true, true, true]);
  });

  it("still flags a real difference", () => {
    const cases: readonly IntlProbeCase[] = [
      { name: "different", run: () => "1.234.567 ₫", expected: "1,234,567 ₫" },
    ];

    const [result] = runIntlProbe(cases);

    expect(result).toMatchObject({
      name: "different",
      actual: "1.234.567 ₫",
      expected: "1,234,567 ₫",
      ok: false,
    });
  });
});
