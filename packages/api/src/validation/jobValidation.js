/**
 * Simple validation for POST /jobs body
 * Returns { valid: true, data } or { valid: false, errors: [] }
 */
function validateEnqueueBody(body) {
  const errors = [];

  if (!body.type || typeof body.type !== 'string' || body.type.trim() === '') {
    errors.push({ field: 'type', message: 'type is required and must be a non-empty string' });
  }
  if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
    errors.push({ field: 'payload', message: 'payload is required and must be a JSON object' });
  }
  if (body.priority && !['HIGH', 'DEFAULT'].includes(body.priority)) {
    errors.push({ field: 'priority', message: 'priority must be HIGH or DEFAULT' });
  }
  if (body.delay_seconds !== undefined && (typeof body.delay_seconds !== 'number' || body.delay_seconds < 0)) {
    errors.push({ field: 'delay_seconds', message: 'delay_seconds must be a non-negative number' });
  }
  if (body.max_attempts !== undefined && (typeof body.max_attempts !== 'number' || body.max_attempts < 1 || body.max_attempts > 10)) {
    errors.push({ field: 'max_attempts', message: 'max_attempts must be between 1 and 10' });
  }

  if (errors.length) return { valid: false, errors };

  return {
    valid: true,
    data: {
      type: body.type.trim(),
      payload: body.payload,
      priority: body.priority || 'DEFAULT',
      delay_seconds: body.delay_seconds || 0,
      max_attempts: body.max_attempts || 3,
      idempotency_key: body.idempotency_key || null,
    },
  };
}

module.exports = { validateEnqueueBody };
