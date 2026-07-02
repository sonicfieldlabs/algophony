/**
 * Algophony Studio — API Rate Limiting
 *
 * Local-first rate limiter backed by the in-process store.
 */

import { getRateLimitStore } from "./rate-limit-store";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

/**
 * Check if a request is allowed under the rate limit.
 * @param key - Unique key (e.g. `userId:routeName`)
 * @param maxRequests - Max requests in the window
 * @param windowMs - Window size in ms (default 60s)
 *
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs = 60_000
): Promise<RateLimitResult> {
  const store = getRateLimitStore();
  const result = await store.incr(key, windowMs);
  const count = result.count;
  const resetAt = result.resetAt;

  if (count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, resetAt - Date.now()),
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - count,
  };
}

/** Rate limit config per route category */
export const RATE_LIMITS = {
  generation: { maxRequests: 10, windowMs: 60_000 },
  api: { maxRequests: 30, windowMs: 60_000 },
} as const;
