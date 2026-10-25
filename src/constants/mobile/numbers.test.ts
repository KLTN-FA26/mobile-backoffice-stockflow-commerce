import { PICKER_LOCALE, SCAN_MOBILE_LIMITS, SESSION_LIMITS, UI_LIMITS } from "./numbers";

describe("mobile number limits", () => {
  it("keeps the session timings from the spec", () => {
    expect(SESSION_LIMITS).toEqual({
      warningBeforeMs: 15 * 60_000,
      tickMs: 30_000,
      sessionDataTtlMs: 24 * 60 * 60_000,
    });
  });

  it("warns well before the session data expires and ticks faster than the warning window", () => {
    expect(SESSION_LIMITS.tickMs).toBeLessThan(SESSION_LIMITS.warningBeforeMs);
    expect(SESSION_LIMITS.warningBeforeMs).toBeLessThan(SESSION_LIMITS.sessionDataTtlMs);
  });

  it("keeps the scan and UI limits from the spec", () => {
    expect(SCAN_MOBILE_LIMITS).toEqual({ dedupeWindowMs: 1500, positiveFeedbackMs: 1500 });
    expect(UI_LIMITS).toEqual({
      maxFontSizeMultiplier: 1.3,
      searchDebounceMs: 300,
      pullSettleGraceMs: 500,
      sheetMaxHeightRatio: 0.85,
    });
    expect(PICKER_LOCALE).toBe("vi-VN");
  });
});
