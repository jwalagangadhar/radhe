interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Checks and records rate limits in memory.
 * @param key unique identifier (e.g. ip:username)
 * @param limit maximum allowed attempts in window
 * @param windowMs time window in milliseconds (default 60,000 for 1 minute)
 */
export function checkRateLimit(key: string, limit = 5, windowMs = 60 * 1000) {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (record.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - record.count),
    retryAfterSeconds: 0,
  };
}

/**
 * Resets rate limit for a key upon successful authentication.
 * @param key
 */
export function resetRateLimit(key: string) {
  rateLimitMap.delete(key);
}
