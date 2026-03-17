require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const crypto = require('crypto');
const Redis = require('ioredis');
const mongoose = require('mongoose');
const { getRedisKey } = require('@forge/broker/src/keys');

async function runBenchmark() {
  const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, curr, idx, arr) => {
      if (curr.startsWith('--')) {
        acc.push([curr.slice(2), arr[idx + 1] || true]);
      }
      return acc;
    }, [])
  );

  const totalJobs = parseInt(args.jobs || '10000', 10);
  const concurrencyLevel = parseInt(args.concurrency || '50', 10); // Batch size for Mongo insertMany
  console.log(`[Benchmark] Queueing ${totalJobs.toLocaleString()} jobs...`);

  const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10)
  });

  const MONGO_URI = process.env.MONGO_URI || 'mongodb://forge:forgepass@localhost:27017/forge?authSource=admin';
  await mongoose.connect(MONGO_URI);

  // Use the actual schema
  const { JobModel } = require('@forge/persistence');

  const startTime = Date.now();
  let enqueued = 0;

  let docs = [];
  let redisPipeline = redis.pipeline();

  for (let i = 0; i < totalJobs; i++) {
    const isHigh = Math.random() < 0.2;
    const priority = isHigh ? 'HIGH' : 'DEFAULT';
    const _id = crypto.randomUUID();

    docs.push({
      _id,
      type: 'email:send',
      payload: { to: `user${i}@example.com` },
      priority,
      status: 'PENDING',
      attempts: 0,
      max_attempts: 3,
      run_at: new Date(),
    });

    redisPipeline.lpush(isHigh ? getRedisKey('queue:high') : getRedisKey('queue:default'), _id);

    if (docs.length >= concurrencyLevel || i === totalJobs - 1) {
      // Bulk insert to Mongo
      await JobModel.insertMany(docs, { ordered: false });
      
      // Bulk push to Redis
      await redisPipeline.exec();
      
      enqueued += docs.length;
      
      // Reset buffers
      docs = [];
      redisPipeline = redis.pipeline();
      
      process.stdout.write(`\r[Benchmark] Enqueued: ${enqueued} / ${totalJobs}`);
    }
  }

  const enqueueTime = Date.now() - startTime;
  console.log(`\n[Benchmark] Enqueue complete in ${(enqueueTime / 1000).toFixed(2)}s`);
  console.log(` Throughput: ${Math.round(totalJobs / (enqueueTime / 1000)).toLocaleString()} ops/sec`);
  
  await mongoose.disconnect();
  redis.disconnect();
  console.log('[Benchmark] Done. Workers are now processing these jobs.');
}

runBenchmark().catch(console.error);
