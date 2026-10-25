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
} as const;

/** Ngưỡng giao diện chung. */
export const UI_LIMITS = {
  maxFontSizeMultiplier: 1.3,
  searchDebounceMs: 300,
} as const;
