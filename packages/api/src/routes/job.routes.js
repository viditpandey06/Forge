const { Router } = require('express');
const { JobRepository, JobModel } = require('@forge/persistence');
const { PriorityQueue, DelayQueue, DeadLetterQueue, RateLimiter, getRedisClient } = require('@forge/broker');
const { getRedisKey } = require('@forge/broker/src/keys');
const { validateEnqueueBody } = require('../validation/jobValidation');
const crypto = require('crypto');

const router = Router();
const jobRepo = new JobRepository();
const priorityQueue = new PriorityQueue();
const delayQueue = new DelayQueue();
const dlq = new DeadLetterQueue();
const rateLimiter = new RateLimiter();

// POST /jobs/bulk — enqueue bulk jobs for testing
router.post('/bulk', async (req, res, next) => {
  try {
    const { count = 1000 } = req.body;
    const safeCount = Math.min(Math.max(1, count), 5000);

    const rl = await rateLimiter.check(`bulk:${req.ip}`);
    if (rl.limited) {
      res.set('Retry-After', String(rl.retryAfterSec));
      return res.status(429).json({ error: 'RATE_LIMITED', retry_after: rl.retryAfterSec });
    }

    const docs = [];
    const redis = getRedisClient();
    const redisPipeline = redis.pipeline();

    for (let i = 0; i < safeCount; i++) {
        const isHigh = Math.random() < 0.2;
        const priority = isHigh ? 'HIGH' : 'DEFAULT';
        const _id = crypto.randomUUID();

        docs.push({
          _id,
          type: 'email:send',
          payload: { to: `bulk${i}@example.com`, note: "Simulated load" },
          priority,
          status: 'PENDING',
          attempts: 0,
          max_attempts: 3,
          run_at: new Date(),
        });
        
        redisPipeline.lpush(isHigh ? getRedisKey('queue:high') : getRedisKey('queue:default'), _id);
    }

    if (docs.length > 0) {
      await JobModel.insertMany(docs, { ordered: false });
      await redisPipeline.exec();
    }

    return res.status(201).json({ message: `Successfully simulated ${safeCount} jobs.`, count: safeCount });
  } catch (err) {
    next(err);
  }
});

// POST /jobs — enqueue a new job
router.post('/', async (req, res, next) => {
  try {
    const validation = validateEnqueueBody(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: validation.errors });
    }
    const input = validation.data;

    // Idempotency check
    if (input.idempotency_key) {
      const existing = await jobRepo.findByIdempotencyKey(input.idempotency_key);
      if (existing) {
        return res.status(200).json({ job_id: existing._id, status: existing.status, duplicate: true });
      }
    }

    // Rate limit check
    const rl = await rateLimiter.check(input.type);
    if (rl.limited) {
      res.set('Retry-After', String(rl.retryAfterSec));
      return res.status(429).json({ error: 'RATE_LIMITED', retry_after: rl.retryAfterSec });
    }

    const run_at = input.delay_seconds > 0
      ? new Date(Date.now() + input.delay_seconds * 1000)
      : new Date();

    // Persist to MongoDB first (durability)
    const job = await jobRepo.create({
      type: input.type,
      payload: input.payload,
      priority: input.priority,
      max_attempts: input.max_attempts,
      idempotency_key: input.idempotency_key,
      run_at,
      status: 'PENDING',
      attempts: 0,
    });

    // Enqueue in Redis
    if (input.delay_seconds > 0) {
      await delayQueue.schedule(job._id, run_at.getTime(), input.priority);
    } else {
      await priorityQueue.enqueue(job._id, input.priority);
    }

    // Cache idempotency key (24h TTL)
    if (input.idempotency_key) {
      await getRedisClient().set(getRedisKey(`dedup:${input.idempotency_key}`), job._id, 'EX', 86400);
    }

    return res.status(201).json({
      job_id: job._id,
      status: 'PENDING',
      queue: input.priority,
      run_at: run_at.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// GET /jobs — list with filters
router.get('/', async (req, res, next) => {
  try {
    const { status, type, priority, from, to, limit, skip } = req.query;
    const result = await jobRepo.listJobs({
      status,
      type,
      priority,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit) : 50,
      skip: skip ? parseInt(skip) : 0,
    });
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /jobs/:id — fetch job status + result
router.get('/:id', async (req, res, next) => {
  try {
    const job = await jobRepo.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'JOB_NOT_FOUND' });
    return res.json(job);
  } catch (err) {
    next(err);
  }
});

// POST /jobs/:id/retry — manually retry a DLQ/FAILED job
router.post('/:id/retry', async (req, res, next) => {
  try {
    const job = await jobRepo.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'JOB_NOT_FOUND' });
    if (job.status !== 'DLQ' && job.status !== 'FAILED') {
      return res.status(400).json({ error: 'JOB_NOT_RETRYABLE', current_status: job.status });
    }

    await dlq.remove(job._id);

    await jobRepo.updateStatus(job._id, 'PENDING', {
      attempts: 0,
      error: null,
      error_stack: null,
      claimed_at: null,
      completed_at: null,
    });
    await priorityQueue.enqueue(job._id, job.priority);

    return res.json({ job_id: job._id, status: 'PENDING' });
  } catch (err) {
    next(err);
  }
});

// DELETE /jobs/:id — cancel a PENDING job
router.delete('/:id', async (req, res, next) => {
  try {
    const cancelled = await jobRepo.cancelJob(req.params.id);
    if (!cancelled) {
      return res.status(400).json({ error: 'JOB_NOT_CANCELLABLE', message: 'Job must be in PENDING status to cancel' });
    }
    await Promise.all([
      priorityQueue.remove(req.params.id),
      delayQueue.remove(req.params.id),
    ]);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
