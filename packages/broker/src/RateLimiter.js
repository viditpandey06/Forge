const { getRedisClient } = require('./QueueClient');
const { getRedisKey } = require('./keys');

const DEFAULT_LIMITS = {
  'email:send': { limit: 100, windowMs: 60_000 },
  'image:resize': { limit: 50, windowMs: 60_000 },
  DEFAULT: { limit: 1000, windowMs: 60_000 },
};

class RateLimiter {
  constructor(limits = DEFAULT_LIMITS) {
    this.limits = limits;
  }

  // Sliding window rate limiter using Redis sorted sets
  // Returns { limited: false } or { limited: true, retryAfterSec }
  async check(jobType) {
    const config = this.limits[jobType] || this.limits['DEFAULT'];
    if (!config) return { limited: false };

    const key = getRedisKey(`rate:${jobType}`);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const pipeline = getRedisClient().pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random().toString(36).slice(2)}`);
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil(config.windowMs / 1000));
    const results = await pipeline.exec();

    const requestCount = results?.[2]?.[1] ?? 0;
    if (requestCount > config.limit) {
      return { limited: true, retryAfterSec: Math.ceil(config.windowMs / 1000) };
    }
    return { limited: false };
  }
}

module.exports = { RateLimiter, DEFAULT_LIMITS };
