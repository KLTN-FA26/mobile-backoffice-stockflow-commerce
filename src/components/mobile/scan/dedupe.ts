import { SCAN_MOBILE_LIMITS } from "@/constants/mobile";

/**
 * The continuous camera's filter: a camera reads the same barcode on frame after frame, so a code
 * seen less than `windowMs` ago is dropped. The window slides: every sighting of the code, accepted
 * or not, starts it again, so a barcode held in view counts once and counts again only after it has
 * been out of view for `windowMs`. (Packing has no client over-pack limit: a held code re-counted
 * every 1.5 s would add phantom lines.) Each code keeps its own window: a box with two labels in
 * view alternates between them. Returns `true` to accept.
 */
export function createScanDeduper(
  windowMs: number = SCAN_MOBILE_LIMITS.dedupeWindowMs,
): (code: string, now?: number) => boolean {
  const lastSeenAt = new Map<string, number>();

  return (code, now = Date.now()) => {
    for (const [seen, at] of lastSeenAt) {
      if (now - at >= windowMs) lastSeenAt.delete(seen);
    }
    const repeat = lastSeenAt.has(code);
    lastSeenAt.set(code, now);
    return !repeat;
  };
}
