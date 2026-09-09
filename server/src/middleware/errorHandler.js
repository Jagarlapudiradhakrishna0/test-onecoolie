/**
 * server/src/middleware/errorHandler.js
 *
 * Centralized Global Error Handling Middleware (Phase 4 Hardened)
 *
 * Protects against internal error, stack trace, and credential leakage in production.
 * In production: outputs generic, sanitized error messages with correlation request ID.
 * In development: includes descriptive context for developer velocity.
 */

const { isProduction } = require('../config/environment');
const { logger } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const prod = isProduction();
  const requestId = req.requestId || req.headers?.['x-request-id'] || 'no-req-id';

  // 1. Specialized Handler: CORS Rejections (403 Forbidden)
  if (err.message && err.message.includes('CORS policy')) {
    return res.status(403).json({
      success: false,
      message: 'Cross-Origin Request Blocked: Origin not allowed by CORS policy.',
      requestId,
      request_id: requestId
    });
  }

  // 2. Specialized Handler: Malformed JSON Syntax Errors (400 Bad Request)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body.',
      requestId,
      request_id: requestId
    });
  }

  // 3. Specialized Handler: Payload Entity Too Large (413 Payload Too Large)
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      message: 'Payload Too Large: Request body exceeds maximum allowed limit (1MB).',
      requestId,
      request_id: requestId
    });
  }

  const statusCode = err.status || err.statusCode || 500;

  // Structured logging of unhandled server exception (scrubbed of secrets)
  logger.error(`[UNHANDLED_EXCEPTION] ${err.message || 'Unknown server error'}`, {
    request_id: requestId,
    method: req.method,
    route: req.originalUrl,
    status: statusCode,
    stack: prod ? '[REDACTED_IN_PRODUCTION]' : err.stack
  });

  // Client response payload for production 500 (Strict internal redaction)
  if (prod && statusCode >= 500) {
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred.',
      requestId,
      request_id: requestId
    });
  }

  // Safe client error (e.g. 400, 403, 404, 409, 429) or development 500
  let message = err.message || 'Bad Request';

  // In production, guard against leaking database or JWT internals in 4xx operational errors
  if (prod) {
    const lower = (message || '').toLowerCase();
    if (
      lower.includes('supabase') ||
      lower.includes('jwt') ||
      lower.includes('token') ||
      lower.includes('secret') ||
      lower.includes('password') ||
      lower.includes('relation') ||
      lower.includes('column') ||
      lower.includes('select ') ||
      lower.includes('from ')
    ) {
      message = 'Invalid request parameters or server verification failed.';
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    requestId,
    request_id: requestId,
    ...(prod ? {} : { stack: err.stack })
  });
}

module.exports = errorHandler;
