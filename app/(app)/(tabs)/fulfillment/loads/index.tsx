import { MOBILE_ROUTES } from "@/constants/mobile";

import { NavItemStub } from "@/components/mobile/NavItemStub";

export default function LoadsRoute() {
  return <NavItemStub href={MOBILE_ROUTES.loads.list} />;
}
