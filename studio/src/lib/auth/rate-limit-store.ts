/**
 * Algophony Studio — Rate Limit Store Interface
 *
 * Local-first in-process limiter. It is intentionally scoped to the local
 * runtime and does not require Redis, hosted accounts, or external storage.
 */

export interface RateLimitStore {
  /** Increment counter for key within window. Returns count and reset timestamp. */
  incr(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

/** In-memory store — single-process only */
class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetAt: number }>();
  private lastSweep = Date.now();
  private static SWEEP_INTERVAL_MS = 30_000;
  private static SOFT_LIMIT = 10_000;

  async incr(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    this.maybeSweep(now);

    const existing = this.store.get(key);
    if (existing && existing.resetAt > now) {
      existing.count++;
      return { count: existing.count, resetAt: existing.resetAt };
    }

    const entry = { count: 1, resetAt: now + windowMs };
    this.store.set(key, entry);
    return entry;
  }

  private maybeSweep(now: number) {
    const sizeTrigger = this.store.size > InMemoryRateLimitStore.SOFT_LIMIT;
    const timeTrigger = now - this.lastSweep > InMemoryRateLimitStore.SWEEP_INTERVAL_MS;
    if (!sizeTrigger && !timeTrigger) return;
    for (const [k, v] of this.store) {
      if (v.resetAt <= now) this.store.delete(k);
    }
    this.lastSweep = now;
  }
}

/** Singleton store instance. */
let _store: RateLimitStore | null = null;

export function getRateLimitStore(): RateLimitStore {
  if (_store) return _store;
  _store = new InMemoryRateLimitStore();
  return _store;
}
