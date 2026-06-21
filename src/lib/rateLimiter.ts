// src/lib/rateLimiter.ts
// Redis-backed rate limiter with in-memory fallback

import { env } from "@/config/env";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp (seconds)
}

interface RateLimitEntry {
  count: number;
  resetTime: number; // Unix timestamp (ms)
}

interface RateLimitStore {
  increment(key: string, ttlMs: number): Promise<RateLimitEntry>;
  reset(key: string): Promise<void>;
}

// ──────────────────────────────────────────────
// In-memory store (fallback when Redis is down)
// ──────────────────────────────────────────────
class InMemoryStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  private startCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (now >= entry.resetTime) this.store.delete(key);
      }
    }, 60_000);
    // Allow process to exit even if timer is active
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  async increment(key: string, ttlMs: number): Promise<RateLimitEntry> {
    this.startCleanup();
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || now >= existing.resetTime) {
      const entry: RateLimitEntry = { count: 1, resetTime: now + ttlMs };
      this.store.set(key, entry);
      return entry;
    }

    existing.count += 1;
    return existing;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// ──────────────────────────────────────────────
// Redis store
// ──────────────────────────────────────────────
let redisStore: RateLimitStore | null = null;

async function createRedisStore(): Promise<RateLimitStore | null> {
  try {
    const { default: Redis } = await import("ioredis");

    const redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD || undefined,
      keyPrefix: "ratelimit:",
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // Fail fast — fall back to in-memory
      lazyConnect: true,
    });

    await redis.connect();

    const store: RateLimitStore = {
      async increment(key: string, ttlMs: number): Promise<RateLimitEntry> {
        const now = Date.now();
        const data = await redis.get(key);
        if (!data) {
          const entry: RateLimitEntry = { count: 1, resetTime: now + ttlMs };
          await redis.set(key, JSON.stringify(entry), "PX", ttlMs);
          return entry;
        }
        const existing: RateLimitEntry = JSON.parse(data);
        if (now >= existing.resetTime) {
          const entry: RateLimitEntry = { count: 1, resetTime: now + ttlMs };
          await redis.set(key, JSON.stringify(entry), "PX", ttlMs);
          return entry;
        }
        existing.count += 1;
        const remainingTtl = Math.max(100, existing.resetTime - now);
        await redis.set(key, JSON.stringify(existing), "PX", remainingTtl);
        return existing;
      },

      async reset(key: string): Promise<void> {
        await redis.del(key);
      },
    };

    console.log("[RATE LIMITER] Connected to Redis");
    return store;
  } catch (err) {
    console.warn(
      "[RATE LIMITER] Redis unavailable, using in-memory fallback:",
      (err as Error)?.message,
    );
    return null;
  }
}

// ──────────────────────────────────────────────
// Resolved store singleton
// ──────────────────────────────────────────────
let resolvedStore: RateLimitStore | null = null;
let storeResolvePromise: Promise<RateLimitStore> | null = null;

async function getStore(): Promise<RateLimitStore> {
  if (resolvedStore) return resolvedStore;

  if (!storeResolvePromise) {
    storeResolvePromise = (async () => {
      const redis = await createRedisStore();
      resolvedStore = redis ?? new InMemoryStore();
      return resolvedStore;
    })();
  }

  return storeResolvePromise;
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

/**
 * Check whether `key` has exceeded its rate limit.
 *
 * @param key   Unique identifier (e.g. `ip:192.168.1.1` or `account:user@example.com`)
 * @returns     Result with success flag, current limit, remaining, and reset timestamp
 */
export async function rateLimit(
  key: string,
  options?: { limit?: number; windowMs?: number },
): Promise<RateLimitResult> {
  const limit = options?.limit ?? env.rateLimit.maxRequests;
  const windowMs = options?.windowMs ?? env.rateLimit.windowMs;

  // Short-circuit when rate limiting is disabled
  if (!env.rateLimit.enabled) {
    return {
      success: true,
      limit,
      remaining: Infinity,
      reset: Math.ceil((Date.now() + windowMs) / 1000),
    };
  }

  const store = await getStore();
  const { count, resetTime } = await store.increment(key, windowMs);

  return {
    success: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    reset: Math.ceil(resetTime / 1000),
  };
}

/**
 * Reset (clear) rate-limit counters for a given key.
 * Useful after a successful login to clear failed-attempt counters.
 */
export async function resetRateLimit(key: string): Promise<void> {
  const store = await getStore();
  await store.reset(key);
}
