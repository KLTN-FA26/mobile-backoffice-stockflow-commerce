/** Nhãn của màn dev kiểm tra `Intl` trên Hermes (`app/dev-intl-probe.tsx`). Chỉ dùng khi `__DEV__`. */
export const INTL_PROBE_LABELS = {
  title: "Kiểm tra Intl (Hermes)",
  hint: "Mở trên Android emulator và iPhone (Expo Go), ghi kết quả vào docs/hermes-intl-probe.md.",
  actual: "Thực tế",
  expected: "Kỳ vọng",
  ok: "OK",
  mismatch: "LỆCH",
} as const;
