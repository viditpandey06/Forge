function getRedisPrefix() {
  return process.env.REDIS_PREFIX || 'forge';
}

function getRedisKey(suffix) {
  return `${getRedisPrefix()}:${suffix}`;
}

module.exports = { getRedisPrefix, getRedisKey };
