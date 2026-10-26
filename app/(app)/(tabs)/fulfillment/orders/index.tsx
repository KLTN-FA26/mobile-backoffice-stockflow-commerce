import { MOBILE_ROUTES } from "@/constants/mobile";

import { NavItemStub } from "@/components/mobile/NavItemStub";

export default function OrdersRoute() {
  return <NavItemStub href={MOBILE_ROUTES.orders.list} />;
}
