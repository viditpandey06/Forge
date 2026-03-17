const EventEmitter = require('eventemitter3');
const { PriorityQueue } = require('@forge/broker');
const { LatencyTracker } = require('./LatencyTracker');

class MetricsCollector extends EventEmitter {
  constructor() {
    super();
    this.completedTimestamps = [];
    this.failedTimestamps = [];
    this.latencyTracker = new LatencyTracker();
    this.recentEvents = [];
    this.totalCompleted = 0;
    this.totalFailed = 0;
    this.totalRetries = 0;
    this.activeJobs = 0;
    this.maxCapacity = 1;
    this.queueDepth = { high: 0, default: 0, dlq: 0 };
    this.throughputSeries = [];
    this._pq = new PriorityQueue();
  }

  setCapacity(n) { this.maxCapacity = Math.max(1, n); }

  applyEvent(event) {
    if (!event || !event.type) return;

    if (event.type === 'job:started') {
      this.activeJobs++;
      return;
    }

    if (event.type === 'job:completed') {
      this.activeJobs = Math.max(0, this.activeJobs - 1);
      this.recordCompleted(event.payload || {});
      return;
    }

    if (event.type === 'job:failed') {
      this.activeJobs = Math.max(0, this.activeJobs - 1);
      this.recordFailed(event.payload || {});
    }
  }

  recordCompleted(event) {
    const now = Date.now();
    this.totalCompleted++;
    this.completedTimestamps.push(now);
    if (event.execution_ms != null) this.latencyTracker.record(event.execution_ms);
    if ((event.attempts || 0) > 1) this.totalRetries++;
    this._addRecentEvent({ ...event, ts: now });
    this.emit('job:completed', event);
  }

  recordFailed(event) {
    const now = Date.now();
    this.totalFailed++;
    this.failedTimestamps.push(now);
    this._addRecentEvent({ ...event, ts: now });
    this.emit('job:failed', event);
  }

  _addRecentEvent(event) {
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > 100) this.recentEvents.pop();
  }

  _prune() {
    const cutoff = Date.now() - 60_000;
    this.completedTimestamps = this.completedTimestamps.filter(t => t >= cutoff);
    this.failedTimestamps = this.failedTimestamps.filter(t => t >= cutoff);
    this.throughputSeries = this.throughputSeries.filter(point => point.ts >= cutoff);
  }

  async refreshQueueDepths() {
    try {
      this.queueDepth = await this._pq.getQueueDepths();
    } catch (_) { /* ignore if Redis not ready */ }
  }

  getSnapshot() {
    this._prune();
    const windowTotal = this.completedTimestamps.length + this.failedTimestamps.length;
    const throughput = this.completedTimestamps.length / 60;
    const failureRate = windowTotal > 0 ? (this.failedTimestamps.length / windowTotal) * 100 : 0;
    const retryRate = this.totalCompleted > 0 ? (this.totalRetries / this.totalCompleted) * 100 : 0;
    const utilisation = this.maxCapacity > 0 ? (this.activeJobs / this.maxCapacity) * 100 : 0;

    this.throughputSeries.push({
      ts: Date.now(),
      throughput: Math.round(throughput * 100) / 100,
    });

    return {
      throughput: Math.round(throughput * 100) / 100,
      throughputSeries: this.throughputSeries.slice(-30),
      queueDepth: this.queueDepth,
      latency: {
        p50: this.latencyTracker.p50(),
        p95: this.latencyTracker.p95(),
        p99: this.latencyTracker.p99(),
      },
      workerUtilisation: Math.min(100, Math.round(utilisation)),
      failureRate: Math.round(failureRate * 10) / 10,
      retryRate: Math.round(retryRate * 10) / 10,
      totalCompleted: this.totalCompleted,
      totalFailed: this.totalFailed,
      recentEvents: this.recentEvents.slice(0, 20),
    };
  }
}

// Singleton shared across API and worker
const metricsCollector = new MetricsCollector();
module.exports = { MetricsCollector, metricsCollector };
