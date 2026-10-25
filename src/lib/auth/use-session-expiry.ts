import { useEffect, useEffectEvent, useState } from "react";

import { SESSION_LIMITS } from "@/constants/mobile";

import { useAuthStore } from "./auth-store";

export interface SessionExpiry {
  /** Time left on the token; 0 once expired, null while no expiry is known. */
  remainingMs: number | null;
  /** Less than `SESSION_LIMITS.warningBeforeMs` left: show the "re-login soon" banner. */
  warning: boolean;
  expired: boolean;
}

/**
 * Counts the token down on the device clock, re-reading it every `SESSION_LIMITS.tickMs` (so a
 * warning or expiry shows at most one tick late). Reaching the expiry marks the session expired,
 * which opens the re-login sheet over the current screen.
 */
export function useSessionExpiry(nowFn: () => number = Date.now): SessionExpiry {
  const expiresAt = useAuthStore((state) => state.sessionExpiresAt);
  const [now, setNow] = useState(nowFn);
  const tick = useEffectEvent(() => setNow(nowFn()));

  useEffect(() => {
    if (expiresAt === null) return;
    const timer = setInterval(tick, SESSION_LIMITS.tickMs);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const remainingMs = expiresAt === null ? null : Math.max(0, expiresAt - now);
  const expired = remainingMs === 0;
  const warning =
    remainingMs !== null && remainingMs > 0 && remainingMs <= SESSION_LIMITS.warningBeforeMs;

  useEffect(() => {
    if (expired) useAuthStore.getState().markSessionExpired();
  }, [expired]);

  return { remainingMs, warning, expired };
}
