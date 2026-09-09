/**
 * server/src/middleware/reliabilityTelemetry.js
 *
 * ONECOOLIE Phase 6.8: Request Reliability & Performance Telemetry Middleware
 *
 * Lightweight observer that measures latency and throughput metrics on every
 * HTTP request/response cycle and feeds them asynchronously into metricsService.
 *
 * STRICT PRIVACY: Completely non-blocking; never touches sensitive bodies, headers, or tokens.
 */

const { recordHttpRequest } = require('../services/metricsService');

/**
 * Express middleware for request duration and reliability metrics.
 */
function reliabilityTelemetry(req, res, next) {
  const startTime = process.hrtime();

  res.on('finish', () => {
    try {
      const diff = process.hrtime(startTime);
      const durationMs = Math.round((diff[0] * 1e3 + diff[1] * 1e-6) * 100) / 100;

      // Extract normalized route path (stripping query parameters and trailing slashes)
      const rawPath = req.baseUrl || req.originalUrl?.split('?')[0] || req.url?.split('?')[0] || 'unknown';
      const cleanRoute = rawPath.replace(/\/+$/, '') || '/';

      recordHttpRequest({
        method: req.method,
        route: cleanRoute,
        statusCode: res.statusCode || 200,
        durationMs
      });
    } catch {
      // Fail-safe: metrics observation must never impact response delivery
    }
  });

  next();
}

module.exports = {
  reliabilityTelemetry
};
