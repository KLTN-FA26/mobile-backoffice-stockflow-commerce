/** Mốc thời gian của phiên đăng nhập và dữ liệu phiên tạm (`session:*`). */
export const SESSION_LIMITS = {
  /** Hiện `SessionExpiryBanner` khi còn ít hơn khoảng này đến `expiresAt`. */
  warningBeforeMs: 15 * 60_000,
  /** Chu kỳ kiểm tra hạn phiên. */
  tickMs: 30_000,
  /** Hạn của dữ liệu phiên tạm — bằng cửa sổ idempotency của BE. */
  sessionDataTtlMs: 24 * 60 * 60_000,
} as const;

/** Ngưỡng của máy quét trên mobile. */
export const SCAN_MOBILE_LIMITS = {
  /** Bỏ qua mã trùng quét liên tiếp trong khoảng này. */
  dedupeWindowMs: 1500,
  /** Thời gian giữ phản hồi "quét được". */
  positiveFeedbackMs: 1500,
  /**
   * Chờ màn camera đóng hẳn rồi mới focus lại ô quét sau "Nhập tay": Android bỏ qua `focus()` gọi
   * trong lúc modal còn đang trượt xuống (đo trên emulator: gọi ngay thì không có bàn phím).
   */
  typeInsteadFocusDelayMs: 400,
} as const;

/** Ngưỡng giao diện chung. */
export const UI_LIMITS = {
  maxFontSizeMultiplier: 1.3,
  searchDebounceMs: 300,
  /**
   * After a pull-to-refresh, how long the pull spinner waits for the reload to show as running
   * before it gives up (a reload that finishes within one render never shows).
   */
  pullSettleGraceMs: 500,
  /** Một `Sheet` cuộn được cao tối đa tỉ lệ này của chiều cao cửa sổ. */
  sheetMaxHeightRatio: 0.85,
} as const;

/** Ngôn ngữ của bộ chọn ngày hệ thống (iOS); Android theo ngôn ngữ máy. */
export const PICKER_LOCALE = "vi-VN";
