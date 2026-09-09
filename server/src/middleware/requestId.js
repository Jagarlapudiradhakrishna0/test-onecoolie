/**
 * server/src/middleware/requestId.js
 *
 * ONECOOLIE Phase 6.7: Request Correlation Identifier Middleware
 *
 * Ensures every incoming HTTP request carries a high-entropy, traceable
 * correlation ID (X-Request-ID). Propagates through req.requestId, res.locals.requestId,
 * response headers, structured logs, and security telemetry.
 */

const crypto = require('crypto');

/**
 * Validates whether a provided request ID conforms to safe alphanumeric characters and hyphens/underscores.
 * @param {string} id
 * @returns {boolean}
 */
function isValidRequestId(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]{8,64}$/.test(id.trim());
}

/**
 * Generates a high-entropy request correlation identifier.
 * @returns {string}
 */
function generateRequestId() {
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `req_${timestamp}_${randomBytes}`;
}

/**
 * Express middleware to attach and emit X-Request-ID.
 */
function requestIdMiddleware(req, res, next) {
  const incomingHeader = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  let correlationId;

  if (incomingHeader && isValidRequestId(incomingHeader)) {
    correlationId = incomingHeader.trim();
  } else {
    correlationId = generateRequestId();
  }

  req.requestId = correlationId;
  res.locals = res.locals || {};
  res.locals.requestId = correlationId;
  if (typeof res.setHeader === 'function') {
    res.setHeader('X-Request-ID', correlationId);
  }

  next();
}

module.exports = {
  requestIdMiddleware,
  isValidRequestId,
  generateRequestId
};
