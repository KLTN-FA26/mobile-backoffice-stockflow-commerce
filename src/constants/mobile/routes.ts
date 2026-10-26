/**
 * Đường dẫn Expo Router của app mobile (không phải route web: web là `ADMIN_ROUTES` trong
 * `src/constants/routes.ts`). Nhóm `(app)`, `(tabs)` không xuất hiện trong URL.
 */
export const MOBILE_ROUTES = {
  /** Màn khởi động: chưa đăng nhập → đăng nhập; đã đăng nhập → hub đầu tiên người dùng thấy được. */
  start: "/",
  login: "/login",
  hubs: {
    inbound: "/inbound",
    warehouse: "/warehouse",
    fulfillment: "/fulfillment",
    account: "/account",
  },
  receipts: { list: "/inbound/receipts" },
  putaway: "/inbound/putaway",
  inventory: {
    overview: "/warehouse/inventory",
    movements: "/warehouse/inventory/movements",
    adjustments: "/warehouse/inventory/adjustments",
  },
  inventoryItems: { list: "/warehouse/inventory-items" },
  warehouseMap: "/warehouse/warehouse-map",
  slotting: "/warehouse/slotting",
  transfers: { list: "/warehouse/transfers" },
  moves: "/warehouse/moves",
  orders: { list: "/fulfillment/orders" },
  picking: { list: "/fulfillment/picking" },
  putBacks: "/fulfillment/put-backs",
  packing: { list: "/fulfillment/packing" },
  shipments: { list: "/fulfillment/shipments" },
  loads: { list: "/fulfillment/loads" },
  scanner: "/scanner",
} as const;
