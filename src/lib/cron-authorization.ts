import { timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validates that the request is authorized using the CRON_SECRET environment variable.
 * Accepts the secret either via:
 * 1. Authorization header: "Bearer <CRON_SECRET>"
 * 2. Query parameter: ?secret=..., ?key=..., or ?cron_secret=...
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || typeof secret !== "string" || !secret.trim()) return false;

  // 1. Authorization header: "Bearer <CRON_SECRET>"
  const authHeader = request.headers.get("authorization");
  if (authHeader && safeCompare(authHeader, `Bearer ${secret}`)) {
    return true;
  }

  // 2. Query parameter: ?secret=..., ?key=..., or ?cron_secret=...
  try {
    const url = new URL(request.url, "http://localhost");
    const querySecret =
      url.searchParams.get("secret") ||
      url.searchParams.get("key") ||
      url.searchParams.get("cron_secret");

    if (querySecret) {
      if (safeCompare(querySecret, secret) || safeCompare(querySecret, `Bearer ${secret}`)) {
        return true;
      }
    }
  } catch {
    // Return false if URL parsing fails
  }

  return false;
}

