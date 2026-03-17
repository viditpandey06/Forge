class FatalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FatalError';
  }
}

function calcBackoffMs(attempt, baseDelayMs = 1000) {
  const cap = 30_000;
  const expBackoff = Math.min(cap, baseDelayMs * 2 ** (attempt - 1));
  return Math.floor(Math.random() * expBackoff); // full jitter
}

module.exports = { FatalError, calcBackoffMs };
