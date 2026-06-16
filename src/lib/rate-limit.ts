// In-memory Rate Limiter for Next.js endpoints
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const cache = new Map<string, RateLimitRecord>();

// Periodically clean up expired entries from the cache to prevent memory leaks
if (typeof global !== "undefined") {
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
  const now = Date.now();
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
