/**
 * Khoá lưu trữ chỉ của mobile. `appStore` là tên zustand persist (kv-store); `secureSession` là
 * mục duy nhất trong expo-secure-store (token); `prefs` là sở thích theo màn (kv-store, `usePrefs`).
 * Dữ liệu phiên tạm không ở đây: nó nằm dưới tiền tố `session:` của `session-store.ts`.
 * `sessionOwner` (kv-store, ngoài tiền tố `session:`) ghi userId sở hữu dữ liệu `session:*`, để
 * người đăng nhập sau (kể cả sau khi khởi động lại app) không nhận dữ liệu của người trước.
 */
export const MOBILE_STORAGE_KEYS = {
  appStore: "stockflow-app",
  secureSession: "stockflow.session",
  sessionOwner: "stockflow:session-owner",
  prefs: (screen: string) => `stockflow:${screen}:config`,
} as const;
