import { useEffect, useState } from "react";

const SECOND_MS = 1000;

export interface Countdown {
  /** Whole seconds left, rounded up; 0 when no countdown is running. */
  seconds: number;
  start: (seconds: number) => void;
}

/**
 * Counts down to a deadline on the device clock, re-read every second, so a countdown that ran
 * while the app was in the background shows the right time again as soon as it is back.
 */
export function useCountdown(): Countdown {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (deadline === null) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) setDeadline(null);
    }, SECOND_MS);
    return () => clearInterval(timer);
  }, [deadline]);

  const start = (seconds: number) => {
    const current = Date.now();
    setNow(current);
    setDeadline(current + seconds * SECOND_MS);
  };

  const seconds = deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / SECOND_MS));
  return { seconds, start };
}
