import { MOBILE_ROUTES } from "@/constants/mobile";

import { NavItemStub } from "@/components/mobile/NavItemStub";

export default function ReceiptsRoute() {
  return <NavItemStub href={MOBILE_ROUTES.receipts.list} />;
}
