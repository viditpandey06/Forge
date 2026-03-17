const cluster = require('cluster');
const os = require('os');
const { DelayQueue } = require('@forge/broker');
const { JobRepository } = require('@forge/persistence');
const { WorkerProcess } = require('./WorkerProcess');

class WorkerPool {
  constructor(workerCount, workerConcurrency) {
    this.workerCount = workerCount || Math.max(1, os.cpus().length - 1);
    this.workerConcurrency = workerConcurrency || 5;
    this.delayQueue = new DelayQueue();
    this.jobRepo = new JobRepository();
    this.isShuttingDown = false;
  }

  async start() {
    if (cluster.isPrimary) {
      console.log(`[WorkerPool] Starting ${this.workerCount} workers...`);

      // Orphan Recovery
      console.log('[WorkerPool] Running orphan recovery...');
      const orphans = await this.jobRepo.findOrphans(120_000); // 2 minutes
      for (const job of orphans) {
        console.log(`[WorkerPool] Recovering orphan job ${job._id}`);
        await this.jobRepo.updateStatus(job._id, 'PENDING', { claimed_at: null });
        const { PriorityQueue } = require('@forge/broker');
        const pq = new PriorityQueue();
        await pq.enqueue(job._id, job.priority);
      }
      console.log(`[WorkerPool] Recovered ${orphans.length} orphan jobs.`);

      // Start Delay Queue Ticker
      this.delayQueue.startTicker(1000);

      // Fork workers
      for (let i = 0; i < this.workerCount; i++) {
        cluster.fork();
      }

      cluster.on('exit', (worker, code, signal) => {
        if (!this.isShuttingDown) {
          console.log(`[WorkerPool] Worker ${worker.process.pid} died. Forking replacement...`);
          cluster.fork();
        }
      });

      this.setupGracefulShutdown();

    } else {
      // Worker Process
      const worker = new WorkerProcess(this.workerConcurrency);
      await worker.start();

      process.on('SIGTERM', async () => {
        console.log(`[Worker ${process.pid}] Received SIGTERM`);
        await worker.stop();
        process.exit(0);
      });
      process.on('SIGINT', async () => {
        console.log(`[Worker ${process.pid}] Received SIGINT`);
        await worker.stop();
        process.exit(0);
      });
    }
  }

  setupGracefulShutdown() {
    const shutdown = () => {
      this.isShuttingDown = true;
      console.log('[WorkerPool] Graceful shutdown initiated');
      this.delayQueue.stopTicker();
      
      for (const id in cluster.workers) {
        cluster.workers[id].process.kill('SIGTERM');
      }
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

module.exports = { WorkerPool };
