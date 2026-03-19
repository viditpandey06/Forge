const Redis = require('ioredis');

let client = null;
let blockingClient = null;

function createRedisConfig() {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  const useTls =
    process.env.REDIS_TLS === 'true' ||
    process.env.REDIS_TLS === '1' ||
    process.env.REDIS_USE_TLS === 'true' ||
    process.env.REDIS_USE_TLS === '1';

  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  };

  if (process.env.REDIS_PASSWORD) {
    config.password = process.env.REDIS_PASSWORD;
  }

  if (process.env.REDIS_USERNAME) {
    config.username = process.env.REDIS_USERNAME;
  }

  if (useTls) {
    config.tls = {};
  }

  return config;
}

function getRedisClient() {
  if (!client) {
    const config = createRedisConfig();
    client =
      typeof config === 'string'
        ? new Redis(config, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
          })
        : new Redis({
            ...config,
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
          });
    client.on('connect', () => console.log('[Redis] Connected'));
    client.on('error', (err) => console.error('[Redis] Error:', err.message));
  }
  return client;
}

// Separate connection for BRPOP — blocking commands must not share a connection
function getBlockingRedisClient() {
  if (!blockingClient) {
    const config = createRedisConfig();
    blockingClient =
      typeof config === 'string'
        ? new Redis(config, {
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
          })
        : new Redis({
            ...config,
            maxRetriesPerRequest: null,
            enableReadyCheck: true,
          });
    blockingClient.on('connect', () => console.log('[Redis Blocking] Connected'));
    blockingClient.on('error', (err) => console.error('[Redis Blocking] Error:', err.message));
  }
  return blockingClient;
}

module.exports = { getRedisClient, getBlockingRedisClient };
