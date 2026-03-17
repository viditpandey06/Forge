const { Router } = require('express');
const { getRedisClient } = require('@forge/broker');
const { metricsCollector } = require('@forge/metrics');
const mongoose = require('mongoose');

const router = Router();

async function sendHealth(_req, res) {
  const redisStatus = getRedisClient().status === 'ready' ? 'connected' : 'disconnected';
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const overall = redisStatus === 'connected' && mongoStatus === 'connected' ? 'ok' : 'degraded';

  return res.status(overall === 'ok' ? 200 : 503).json({
    status: overall,
    redis: redisStatus,
    mongo: mongoStatus,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

router.get('/', sendHealth);
router.get('/health', sendHealth);

router.get('/metrics', (_req, res) => {
  return res.json(metricsCollector.getSnapshot());
});

module.exports = router;
