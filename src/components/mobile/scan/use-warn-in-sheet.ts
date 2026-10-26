import { useEffect } from "react";

import { useInSheet } from "@/components/ui";

/**
 * Development only: says so when a `ScanField` is rendered inside a `Sheet` (scanning.md). The
 * camera opens a full-screen route over the sheet, a scanner's codes land in a field the keyboard
 * logic of the sheet moves around, and a station keeps its scan field on the screen itself.
 */
export function useWarnInSheet(): void {
  const inSheet = useInSheet();

  useEffect(() => {
    if (__DEV__ && inSheet) {
      console.warn(
        "ScanField inside a Sheet: put the scan field on the screen (scanning.md), not in a sheet.",
      );
    }
  }, [inSheet]);
}
