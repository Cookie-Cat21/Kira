type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; retryAfterSec: number };

/** Fixed-window limiter. `key` is typically `${ip}:${route}`. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (b.count < limit) {
    b.count++;
    return { allowed: true, retryAfterSec: 0 };
  }
  return {
    allowed: false,
    retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
  };
}

/** Opportunistic cleanup so the Map cannot grow unbounded on a warm instance. */
export function sweep(now: number = Date.now()): void {
  for (const [k, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(k);
  }
}

/** Test-only: reset in-memory state between unit tests. */
export function resetRateLimitStore(): void {
  buckets.clear();
}
