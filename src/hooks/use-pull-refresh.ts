/**
 * The state of a list's native pull-to-refresh spinner.
 *
 * The spinner is for a pull: it starts when the user pulls and stops when the reload that the pull
 * started has settled. A background reload (focus, a filter change, `staleTime`) is not a pull and
 * does not show it: the thin `RefetchBar` under the header says "reloading" there.
 */

import { useEffect, useRef, useState } from "react";

import { UI_LIMITS } from "@/constants/mobile";

export type PullRefresh = {
  /** For `RefreshControl.refreshing`. */
  refreshing: boolean;
  /** For `RefreshControl.onRefresh`: starts the spinner, then asks for the reload. */
  onPull: () => void;
};

/**
 * @param isRefetching - whether the list is reloading, from the query
 * @param onRefresh - starts the reload
 */
export function usePullRefresh(isRefetching: boolean, onRefresh: () => void): PullRefresh {
  const [pulled, setPulled] = useState(false);
  // The reload of this pull has been seen running: its end is the end of the spinner.
  const seenRunning = useRef(false);

  useEffect(() => {
    if (!pulled) {
      seenRunning.current = false;
      return;
    }
    if (isRefetching) {
      seenRunning.current = true;
      return;
    }
    if (seenRunning.current) {
      setPulled(false);
      return;
    }
    // Right after a pull the reload has not started yet: wait for it, but not for ever. One that
    // finishes within a single render never shows as running, and the spinner must not stick.
    const timer = setTimeout(() => setPulled(false), UI_LIMITS.pullSettleGraceMs);
    return () => clearTimeout(timer);
  }, [pulled, isRefetching]);

  const onPull = () => {
    setPulled(true);
    onRefresh();
  };

  return { refreshing: pulled, onPull };
}
