// ============================================================
// Distributed rate limiter
// When REDIS_URL (or RATE_LIMIT_REDIS_URL) is configured, counters
// live in Redis so limits are shared across every replica. If Redis
// is unreachable or unconfigured, it falls back to the in-memory
// limiter so a single instance keeps working.
// ============================================================

import { checkRateLimit, type RateLimitResult } from "./rate-limit";
import { RedisClient, parseRedisUrl } from "./redis";

interface DistributedConfig {
  windowMs?: number;
  maxRequests?: number;
}

let client: RedisClient | null = null;
let initialized = false;

function getClient(): RedisClient | null {
  if (initialized) return client;
  initialized = true;
  const url = process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_URL;
  if (!url) return null;
  try {
    client = new RedisClient(parseRedisUrl(url));
  } catch {
    client = null;
  }
  return client;
}

export async function checkRateLimitDistributed(
  key: string,
  config: DistributedConfig = {}
): Promise<RateLimitResult> {
  const { windowMs = 60 * 1000, maxRequests = 60 } = config;
  const redis = getClient();
  if (!redis) return checkRateLimit(key, { windowMs, maxRequests });

  try {
    const redisKey = `ratelimit:${key}`;
    const count = Number(await redis.command(["INCR", redisKey]));
    if (count === 1) await redis.command(["PEXPIRE", redisKey, String(windowMs)]);
    const ttl = Number(await redis.command(["PTTL", redisKey]));
    const resetAt = Date.now() + (ttl > 0 ? ttl : windowMs);
    if (count > maxRequests) return { allowed: false, remaining: 0, resetAt };
    return { allowed: true, remaining: maxRequests - count, resetAt };
  } catch {
    // Redis unhealthy — degrade to the per-process limiter rather than
    // failing requests outright.
    return checkRateLimit(key, { windowMs, maxRequests });
  }
}

// Test/utility hook — reset the memoized client (e.g. after changing env).
export function resetRateLimitRedisClient(): void {
  client?.close();
  client = null;
  initialized = false;
}
