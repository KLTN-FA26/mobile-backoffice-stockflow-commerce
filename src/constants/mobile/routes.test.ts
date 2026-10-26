import { MOBILE_ROUTES } from "./routes";

describe("mobile routes", () => {
  it("keeps the plan's route paths, plus the start route", () => {
    expect(MOBILE_ROUTES).toEqual({
      // R38: the start route resolves to the first hub the user can see.
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
    });
  });
});
