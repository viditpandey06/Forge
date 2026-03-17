const { getRedisClient } = require('@forge/broker');
const { metricsCollector } = require('./MetricsCollector');
const { getRedisKey } = require('@forge/broker/src/keys');

const METRICS_CHANNEL = getRedisKey('metrics:events');

function startSocketEmitter(io, intervalMs = 1000) {
  const subscriber = getRedisClient().duplicate();

  subscriber.on('message', (_channel, message) => {
    try {
      metricsCollector.applyEvent(JSON.parse(message));
    } catch (error) {
      console.error('[Metrics] Failed to process metrics event:', error.message);
    }
  });

  subscriber.subscribe(METRICS_CHANNEL).catch((error) => {
    console.error('[Metrics] Subscription failed:', error.message);
  });

  return setInterval(async () => {
    await metricsCollector.refreshQueueDepths();
    const snapshot = metricsCollector.getSnapshot();
    io.emit('metrics:update', snapshot);
  }, intervalMs);
}

async function publishMetricEvent(type, payload = {}) {
  await getRedisClient().publish(METRICS_CHANNEL, JSON.stringify({ type, payload }));
}

module.exports = { startSocketEmitter, publishMetricEvent, METRICS_CHANNEL };
