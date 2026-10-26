import { MOBILE_ROUTES } from "@/constants/mobile";

import { NavItemStub } from "@/components/mobile/NavItemStub";

export default function StockMovementsRoute() {
  return <NavItemStub href={MOBILE_ROUTES.inventory.movements} />;
}
