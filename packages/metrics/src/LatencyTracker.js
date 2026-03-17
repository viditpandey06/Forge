class LatencyTracker {
  constructor(windowMs = 5 * 60_000) {
    this.windowMs = windowMs;
    this.entries = [];
  }

  record(ms) {
    const now = Date.now();
    this.entries.push({ ts: now, ms });
    this._prune(now);
  }

  _prune(now) {
    const cutoff = now - this.windowMs;
    this.entries = this.entries.filter((e) => e.ts >= cutoff);
  }

  percentile(p) {
    this._prune(Date.now());
    if (this.entries.length === 0) return 0;
    const sorted = [...this.entries].sort((a, b) => a.ms - b.ms);
    const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[idx].ms;
  }

  p50() { return this.percentile(50); }
  p95() { return this.percentile(95); }
  p99() { return this.percentile(99); }
}

module.exports = { LatencyTracker };
