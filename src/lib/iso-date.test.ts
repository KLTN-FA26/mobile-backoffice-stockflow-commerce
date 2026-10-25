import { clampDate, isoToLocalDate, localDateToIso } from "./iso-date";

function day(iso: string): Date {
  const date = isoToLocalDate(iso);
  if (date === null) throw new Error(`${iso} should be a date`);
  return date;
}

describe("iso date helpers", () => {
  it("reads YYYY-MM-DD as that calendar day at noon, local time", () => {
    const date = day("2026-03-15");

    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 2, 15, 12,
    ]);
  });

  it("reads anything else as no date", () => {
    for (const text of [
      "",
      "abc",
      "2026-3-5",
      "2026/03/15",
      "15-03-2026",
      "2026-13-01",
      "2026-00-10",
      "2026-02-30",
      "2026-04-31",
      "0099-01-01",
      "2026-03-15T10:00:00Z",
      " 2026-03-15",
    ]) {
      expect(isoToLocalDate(text)).toBeNull();
    }
  });

  it("knows leap days", () => {
    expect(isoToLocalDate("2028-02-29")).not.toBeNull();
    expect(isoToLocalDate("2026-02-29")).toBeNull();
  });

  it("writes a local date back as the same YYYY-MM-DD", () => {
    expect(localDateToIso(new Date(2026, 0, 5, 0, 30))).toBe("2026-01-05");
    expect(localDateToIso(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });

  it("round-trips every day of a leap year", () => {
    for (let n = 1; n <= 366; n += 1) {
      const date = new Date(2028, 0, n, 12);
      expect(isoToLocalDate(localDateToIso(date))?.getTime()).toBe(date.getTime());
    }
  });

  it("clamps a date into the allowed range", () => {
    const min = day("2026-03-10");
    const max = day("2026-03-20");

    expect(clampDate(day("2026-03-01"), min, max)).toBe(min);
    expect(clampDate(day("2026-04-01"), min, max)).toBe(max);
    const inside = day("2026-03-15");
    expect(clampDate(inside, min, max)).toBe(inside);
    expect(clampDate(inside, undefined, undefined)).toBe(inside);
  });
});
