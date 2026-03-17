const { getRedisClient } = require('./QueueClient');
const { QUEUE_DLQ } = require('./PriorityQueue');

class DeadLetterQueue {
  async push(jobId) {
    await getRedisClient().lpush(QUEUE_DLQ, jobId);
  }

  async list(limit = 100) {
    return getRedisClient().lrange(QUEUE_DLQ, 0, limit - 1);
  }

  async remove(jobId) {
    await getRedisClient().lrem(QUEUE_DLQ, 0, jobId);
  }

  async size() {
    return getRedisClient().llen(QUEUE_DLQ);
  }
}

module.exports = { DeadLetterQueue };
