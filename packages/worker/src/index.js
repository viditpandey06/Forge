require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const { connectMongo } = require('@forge/persistence');
const { getRedisClient } = require('@forge/broker');
const { WorkerPool } = require('./pool/WorkerPool');
const { handlerRegistry } = require('./registry/HandlerRegistry');

// Load handlers so they register with the registry
require('./handlers/emailHandler');

async function start() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://forge:forgepass@localhost:27017/forge?authSource=admin';

  // Connect backing services
  await connectMongo(MONGO_URI);
  getRedisClient().ping();

  // Start pool
  const workerCount = parseInt(process.env.WORKER_COUNT || '4');
  const workerConcurrency = parseInt(process.env.WORKER_CONCURRENCY || '5');
  
  const pool = new WorkerPool(workerCount, workerConcurrency);
  await pool.start();
}

start().catch(err => {
  console.error('[Worker] Startup failed', err);
  process.exit(1);
});

module.exports = { WorkerPool, handlerRegistry };
