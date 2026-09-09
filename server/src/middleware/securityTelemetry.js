/**
 * server/src/middleware/securityTelemetry.js
 *
 * ONECOOLIE Phase 6.7: Request-Level Security Telemetry Middleware
 *
 * Captures request execution metrics and potential attack indicators without
 * ever logging sensitive credentials (passwords, tokens, OTPs, recovery codes, cookies).
 */

const { logger } = require('../utils/logger');

/**
 * Masks IP address to preserve privacy while maintaining forensic subnet correlation.
 * e.g., '192.168.1.145' -> '192.168.1.xxx'
 * @param {string} ip
 * @returns {string}
 */
function maskIp(ip) {
  if (!ip || typeof ip !== 'string') return 'unknown';
  const cleanIp = ip.replace(/^::ffff:/, '').trim();
  if (cleanIp.includes('.')) {
    const parts = cleanIp.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }
  if (cleanIp.includes(':')) {
    const parts = cleanIp.split(':');
    if (parts.length > 2) {
      return `${parts[0]}:${parts[1]}:xxxx:xxxx`;
    }
  }
  return cleanIp;
}

/**
 * Express middleware to observe request-response cycle for security anomalies.
 */
function securityTelemetry(req, res, next) {
  const startTime = process.hrtime();
  const requestId = req.requestId || 'req_unassigned';

  // Hook into response finish
  res.on('finish', () => {
    try {
      const diff = process.hrtime(startTime);
      const durationMs = Math.round((diff[0] * 1e3 + diff[1] * 1e-6) * 100) / 100;
      const statusCode = res.statusCode;

      // Only record detailed telemetry for security-relevant HTTP status codes (4xx / 5xx)
      // or sensitive security endpoints (/api/auth, /api/admin)
      const isSensitivePath = req.originalUrl && (
        req.originalUrl.startsWith('/api/auth') ||
        req.originalUrl.startsWith('/api/admin') ||
        req.originalUrl.startsWith('/api/security')
      );

      if (statusCode >= 400 || isSensitivePath) {
        const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress;
        const telemetry = {
          requestId,
          method: req.method,
          path: req.originalUrl?.split('?')[0] || req.url,
          statusCode,
          durationMs,
          maskedIp: maskIp(rawIp),
          userId: req.user?.id || req.userSession?.user_id || null,
          sessionId: req.userSession?.id || req.user?.sid || null,
          userAgent: req.headers['user-agent']?.slice(0, 200) || 'Unknown'
        };

        if (statusCode === 401 || statusCode === 403 || statusCode === 423 || statusCode === 429) {
          logger.warn(`[SECURITY_TELEMETRY] Anomalous response ${statusCode}`, telemetry);
        }
      }
    } catch (err) {
      // Fail-safe: telemetry observer must never crash or interfere with request
    }
  });

  next();
}

/**
 * Recursively scrubs sensitive credentials from telemetry payloads and log objects.
 * @param {any} data
 * @returns {any}
 */
function scrubSensitiveData(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(scrubSensitiveData);

  const sensitiveKeys = new Set([
    'password', 'token', 'accesstoken', 'refreshtoken', 'mfa_code',
    'otp', 'recoverycode', 'recovery_code', 'totp_secret', 'secret',
    'mfasecret', 'cookie', 'cookies'
  ]);

  const scrubbed = {};
  for (const [key, val] of Object.entries(data)) {
    if (sensitiveKeys.has(key.toLowerCase())) {
      scrubbed[key] = '[REDACTED]';
    } else if (val && typeof val === 'object') {
      scrubbed[key] = scrubSensitiveData(val);
    } else {
      scrubbed[key] = val;
    }
  }
  return scrubbed;
}

module.exports = {
  securityTelemetry,
  maskIp,
  scrubSensitiveData
};
