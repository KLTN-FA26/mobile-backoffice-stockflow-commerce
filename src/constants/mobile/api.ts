/** Đường dẫn xác thực, tính từ `EXPO_PUBLIC_API_URL` (đã gồm `/api/v1`). */
export const AUTH_ENDPOINTS = {
  login: "/identity/auth/login",
  me: "/identity/me",
  logout: "/identity/auth/logout",
} as const;

/** Tên sản phẩm trong header `User-Agent: StockFlowMobile/<version> (<OS> <version>; <model>)`. */
export const USER_AGENT_PRODUCT = "StockFlowMobile";
