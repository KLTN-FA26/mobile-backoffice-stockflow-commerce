import { MOBILE_ROUTES } from "@/constants/mobile";

import { NavItemStub } from "@/components/mobile/NavItemStub";

export default function ShipmentsRoute() {
  return <NavItemStub href={MOBILE_ROUTES.shipments.list} />;
}
