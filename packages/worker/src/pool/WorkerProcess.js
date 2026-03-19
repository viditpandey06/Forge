const { JobRepository } = require('@forge/persistence');
const { PriorityQueue, DeadLetterQueue } = require('@forge/broker');
const { handlerRegistry } = require('../registry/HandlerRegistry');
const { publishMetricEvent } = require('@forge/metrics');
const { calcBackoffMs, FatalError } = require('../retry/RetryStrategy');

const jobRepo = new JobRepository();
const priorityQueue = new PriorityQueue();
const dlq = new DeadLetterQueue();

class WorkerProcess {
  constructor(concurrency = 1, timeoutMs = 30000) {
    this.concurrency = concurrency;
    this.timeoutMs = timeoutMs;
    this.activeJobs = 0;
    this.isShuttingDown = false;
  }

  async start() {
    console.log(`[Worker ${process.pid}] Started with polling loop (Concurrency: ${this.concurrency})`);
    this.pollLoop();
  }

  async stop() {
    this.isShuttingDown = true;
    console.log(`[Worker ${process.pid}] Shutting down, waiting for ${this.activeJobs} active jobs...`);
    while (this.activeJobs > 0) {
      await new Promise((r) => setTimeout(r, 100));
    }
    console.log(`[Worker ${process.pid}] Shutdown complete.`);
  }

  async pollLoop() {
    while (!this.isShuttingDown) {
      if (this.activeJobs >= this.concurrency) {
        // We are at max concurrency, pause fetching
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      try {
        const item = await priorityQueue.dequeue(5); // 5 sec block
        if (!item) continue;

        const [queue, jobId] = item;
        // Start processing WITHOUT awaiting, to fetch the next job immediately!
        this.processJob(jobId).catch(err => console.error(`[Worker ${process.pid}] Job error:`, err));
      } catch (err) {
        console.error(`[Worker ${process.pid}] Polling error:`, err.message);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  async processJob(jobId) {
    this.activeJobs++;
    const startTime = Date.now();

    try {
      const job = await jobRepo.claimJob(jobId);
      if (!job) {
        return;
      }

      await publishMetricEvent('job:started', { jobId, type: job.type });

      const handler = handlerRegistry.get(job.type);
      if (!handler) {
        throw new FatalError(`No handler registered for type: ${job.type}`);
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(handler, job.payload, this.timeoutMs);

      // Mark completed
      const execMs = Date.now() - startTime;
      await jobRepo.updateStatus(jobId, 'COMPLETED', {
        completed_at: new Date(),
        result,
        execution_ms: execMs,
      });

      await publishMetricEvent('job:completed', {
        jobId,
        type: job.type,
        status: 'COMPLETED',
        execution_ms: execMs,
        attempts: job.attempts + 1,
      });
    } catch (err) {
      await this.handleFailure(jobId, err);
    } finally {
      this.activeJobs--;
    }
  }

  async handleFailure(jobId, err) {
    try {
      const job = await jobRepo.findById(jobId);
      if (!job) return;

      const isFatal = err instanceof FatalError || err.name === 'FatalError';
      const nextAttempt = job.attempts + 1;
      const isMaxAttempts = nextAttempt >= job.max_attempts;

      if (isFatal || isMaxAttempts) {
        await dlq.push(jobId);
        await jobRepo.updateStatus(jobId, 'DLQ', {
          status: 'DLQ',
          attempts: nextAttempt,
          error: err.message,
          error_stack: err.stack,
        });
        await publishMetricEvent('job:failed', {
          jobId,
          type: job.type,
          status: 'DLQ',
          attempts: nextAttempt,
          error: err.message,
        });
      } else {
        await jobRepo.incrementAttempts(jobId, err.message, err.stack);
        const delayMs = calcBackoffMs(nextAttempt, parseInt(process.env.BASE_RETRY_DELAY_MS || '1000'));

        const { DelayQueue } = require('@forge/broker');
        const delayQueue = new DelayQueue();
        await delayQueue.schedule(jobId, Date.now() + delayMs, job.priority);
        await jobRepo.updateStatus(jobId, 'PENDING', { claimed_at: null });
        await publishMetricEvent('job:failed', {
          jobId,
          type: job.type,
          status: 'FAILED',
          attempts: nextAttempt,
          error: err.message,
        });
      }
    } catch (fallbackErr) {
      console.error(`[Worker ${process.pid}] Fatal failure handler error:`, fallbackErr);
    }
  }

  executeWithTimeout(fn, payload, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Job handler timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn(payload)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}

module.exports = { WorkerProcess };
