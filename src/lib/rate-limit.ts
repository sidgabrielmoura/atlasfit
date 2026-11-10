import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
// Development/test fallback only. Production counters are shared across instances.
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const cache = new Map<string, RateLimitRecord>();

export async function pruneRateLimitBuckets(now = new Date()) {
  return prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE key IN (SELECT key FROM "RateLimitBucket" WHERE "resetAt" < ${now} ORDER BY "resetAt" LIMIT 10000)`;
}

// Periodically clean up expired entries from the cache to prevent memory leaks
if (typeof global !== "undefined" && process.env.NODE_ENV !== "production" && process.env.RATE_LIMIT_STORE !== "postgres") {
  const intervalId = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now > value.resetTime) {
        cache.delete(key);
      }
    }
  }, 60000); // clean every minute

  if (intervalId.unref) {
    intervalId.unref();
  }
}

export interface RateLimitResponse {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Checks request limits for a given identifier (e.g. IP).
 * @param identifier The target key (like client IP) to rate limit.
 * @param limit Max allowed requests within the window.
 * @param windowMs Time window in milliseconds.
 */
export async function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResponse> {
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowMs) || windowMs < 1) throw new Error("INVALID_RATE_LIMIT_POLICY");
  const now = Date.now();
  if (process.env.NODE_ENV === "production" || process.env.RATE_LIMIT_STORE === "postgres") {
    const reset = Math.floor(now / windowMs) * windowMs + windowMs;
    const key = createHash("sha256").update(`${identifier}:${limit}:${windowMs}:${reset}`).digest("hex");
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "RateLimitBucket" (key,count,"resetAt") VALUES (${key},1,${new Date(reset)})
      ON CONFLICT (key) DO UPDATE SET count=LEAST("RateLimitBucket".count+1,${limit + 1})
      RETURNING count`;
    const count = rows[0].count;
    return { success: count <= limit, limit, remaining: Math.max(0, limit - count), reset };
  }
  const record = cache.get(identifier);

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    const newRecord = { count: 1, resetTime };
    cache.set(identifier, newRecord);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetTime,
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: record.resetTime,
  };
}
