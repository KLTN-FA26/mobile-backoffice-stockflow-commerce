import { MOBILE_ROUTES } from "@/constants/mobile";

import { NavItemStub } from "@/components/mobile/NavItemStub";

export default function InventoryItemsRoute() {
  return <NavItemStub href={MOBILE_ROUTES.inventoryItems.list} />;
}
