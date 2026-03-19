require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server: SocketServer } = require('socket.io');

const { connectMongo } = require('@forge/persistence');
const { getRedisClient } = require('@forge/broker');
const { startSocketEmitter } = require('@forge/metrics');

const jobRoutes = require('./routes/job.routes');
const healthRoutes = require('./routes/health.routes');

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/jobs', jobRoutes);
app.use('/', healthRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[API Error]', err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

// Socket.io connection log
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[Socket.io] Client disconnected: ${socket.id}`));
});

async function start() {
  const PORT = process.env.PORT || 3000;
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://forge:forgepass@localhost:27017/forge?authSource=admin';
  const workerCount = parseInt(process.env.WORKER_COUNT || '4', 10);
  const workerConcurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

  // Connect to MongoDB
  await connectMongo(MONGO_URI);

  // Warm up Redis connection
  getRedisClient().ping();

  const { metricsCollector } = require('@forge/metrics');
  metricsCollector.setCapacity(workerCount * workerConcurrency);

  // Start Socket.io metrics emitter (1s interval)
  startSocketEmitter(io, 1000);

  // --- Ghost Traffic Generator For Portfolio ---
  // Every 2 seconds, gently add 2-3 jobs if the queue is quiet
  setInterval(async () => {
    try {
      const { getRedisKey } = require('@forge/broker/src/keys');
      const { JobModel } = require('@forge/persistence');
      const crypto = require('crypto');
      const redis = getRedisClient();

      // Only add jobs if the queue depth is low so we don't accidentally overload it forever
      const depth = await redis.llen(getRedisKey('queue:default'));
      if (depth < 100) {
        const docs = [];
        const redisPipeline = redis.pipeline();
        
        for (let i = 0; i < 3; i++) {
          const _id = crypto.randomUUID();
          docs.push({
            _id,
            type: 'email:send',
            payload: { to: 'ghost@example.com', note: 'Ghost Traffic' },
            priority: 'DEFAULT',
            status: 'PENDING',
            attempts: 0,
            max_attempts: 3,
            run_at: new Date(),
          });
          redisPipeline.lpush(getRedisKey('queue:default'), _id);
        }

        await JobModel.insertMany(docs, { ordered: false });
        await redisPipeline.exec();
      }
    } catch(err) {
      // ignore ghost traffic errors
    }
  }, 2000);

  server.listen(PORT, () => {
    console.log(`[Forge API] Listening on http://localhost:${PORT}`);
    console.log(`[Forge API] Health → http://localhost:${PORT}/health`);
  });
}

start().catch((err) => {
  console.error('[Forge API] Startup failed:', err);
  process.exit(1);
});
