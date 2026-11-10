import { timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validates that the request is authorized using the CRON_SECRET environment variable.
 * Accepts only the Authorization header; URL secrets leak into logs/history.
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || typeof secret !== "string" || !secret.trim()) return false;

  // 1. Authorization header: "Bearer <CRON_SECRET>"
  const authHeader = request.headers.get("authorization");
  if (authHeader && safeCompare(authHeader, `Bearer ${secret}`)) {
    return true;
  }

  return false;
}

