const { getRedisClient, getBlockingRedisClient } = require('./QueueClient');
const { getRedisKey } = require('./keys');

const QUEUE_HIGH = getRedisKey('queue:high');
const QUEUE_DEFAULT = getRedisKey('queue:default');
const QUEUE_DLQ = getRedisKey('dlq');
const DELAY_QUEUE = getRedisKey('delay');

class PriorityQueue {
  async enqueue(jobId, priority) {
    const key = priority === 'HIGH' ? QUEUE_HIGH : QUEUE_DEFAULT;
    await getRedisClient().lpush(key, jobId);
  }

  // Returns [queueName, jobId] or null on timeout
  async dequeue(timeoutSec = 5) {
    return getBlockingRedisClient().brpop(QUEUE_HIGH, QUEUE_DEFAULT, timeoutSec);
  }

  async getQueueDepths() {
    const redis = getRedisClient();
    const [high, def, dlq] = await Promise.all([
      redis.llen(QUEUE_HIGH),
      redis.llen(QUEUE_DEFAULT),
      redis.llen(QUEUE_DLQ),
    ]);
    return { high, default: def, dlq };
  }

  async remove(jobId) {
    const redis = getRedisClient();
    await Promise.all([
      redis.lrem(QUEUE_HIGH, 0, jobId),
      redis.lrem(QUEUE_DEFAULT, 0, jobId),
    ]);
  }
}

module.exports = { PriorityQueue, QUEUE_HIGH, QUEUE_DEFAULT, QUEUE_DLQ, DELAY_QUEUE };
