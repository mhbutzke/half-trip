/**
 * In-memory rate limiter for API routes and server actions.
 * Uses a sliding window approach with automatic cleanup.
 *
 * LIMITATION: This works per-instance (not distributed). On Vercel serverless,
 * each function invocation may get a different instance, reducing effectiveness.
 * For production-grade rate limiting, migrate to Upstash Redis (@upstash/ratelimit)
 * or Vercel KV. The in-memory approach still provides protection during
 * warm starts (same instance handles multiple requests).
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60 seconds to prevent memory leaks
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 60_000);
  // Don't block process exit
  if (typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
    cleanupInterval.unref();
  }
}

type RateLimitConfig = {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
};

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

/**
 * Check if a request should be rate limited.
 *
 * @param key - Unique identifier (e.g., userId, IP address)
 * @param config - Rate limit configuration
 * @returns Result with success boolean and limit metadata
 *
 * @example
 * ```ts
 * const result = rateLimit(userId, { limit: 30, windowSeconds: 60 });
 * if (!result.success) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * }
 * ```
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  ensureCleanup();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const entry = store.get(key);

  // No existing entry or window expired — start fresh
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, limit: config.limit, remaining: config.limit - 1, resetAt };
  }

  // Window still active
  entry.count++;

  if (entry.count > config.limit) {
    return { success: false, limit: config.limit, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}
