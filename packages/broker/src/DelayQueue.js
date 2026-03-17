const { getRedisClient } = require('./QueueClient');
const { QUEUE_HIGH, QUEUE_DEFAULT, DELAY_QUEUE } = require('./PriorityQueue');

class DelayQueue {
  constructor() {
    this._ticker = null;
  }

  _encode(jobId, priority = 'DEFAULT') {
    return JSON.stringify({ jobId, priority });
  }

  _decode(member) {
    try {
      const parsed = JSON.parse(member);
      if (parsed && parsed.jobId) {
        return {
          jobId: parsed.jobId,
          priority: parsed.priority === 'HIGH' ? 'HIGH' : 'DEFAULT',
        };
      }
    } catch (_) {
      // Backward compatibility for any existing plain job IDs.
    }

    return { jobId: member, priority: 'DEFAULT' };
  }

  async schedule(jobId, runAtMs, priority = 'DEFAULT') {
    await getRedisClient().zadd(DELAY_QUEUE, runAtMs, this._encode(jobId, priority));
  }

  async tick() {
    const now = Date.now();
    const dueEntries = await getRedisClient().zrangebyscore(DELAY_QUEUE, 0, now);
    if (dueEntries.length === 0) return 0;

    const pipeline = getRedisClient().pipeline();
    for (const entry of dueEntries) {
      const { jobId, priority } = this._decode(entry);
      const targetQueue = priority === 'HIGH' ? QUEUE_HIGH : QUEUE_DEFAULT;
      pipeline.zrem(DELAY_QUEUE, entry);
      pipeline.lpush(targetQueue, jobId);
    }
    await pipeline.exec();
    return dueEntries.length;
  }

  async remove(jobId) {
    const redis = getRedisClient();
    const entries = await redis.zrange(DELAY_QUEUE, 0, -1);
    const pipeline = redis.pipeline();

    for (const entry of entries) {
      if (this._decode(entry).jobId === jobId) {
        pipeline.zrem(DELAY_QUEUE, entry);
      }
    }

    await pipeline.exec();
    return true;
  }

  startTicker(intervalMs = 1000) {
    if (this._ticker) return;
    this._ticker = setInterval(() => {
      this.tick().catch((err) => console.error('[DelayQueue] tick error:', err.message));
    }, intervalMs);
  }

  stopTicker() {
    if (this._ticker) {
      clearInterval(this._ticker);
      this._ticker = null;
    }
  }
}

module.exports = { DelayQueue };
