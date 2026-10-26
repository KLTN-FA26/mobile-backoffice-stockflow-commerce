import { Card } from "@/components/shared";

import type { ReactNode } from "react";

/** The card the account tab puts its rows in when they need no title (`Section` is the titled one). */
export function AccountCard({ children }: { children: ReactNode }) {
  return <Card className="px-[16px] py-[4px]">{children}</Card>;
}
