import { MOBILE_ROUTES } from "@/constants/mobile";

import { NavItemStub } from "@/components/mobile/NavItemStub";

export default function PackingRoute() {
  return <NavItemStub href={MOBILE_ROUTES.packing.list} />;
}
