import { timingSafeEqual } from "node:crypto";

/** Jobs accept only the dedicated secret in the Authorization header. */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") || "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
