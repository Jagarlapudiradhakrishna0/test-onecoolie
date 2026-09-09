/**
 * server/src/middleware/csrfProtection.js
 *
 * ONECOOLIE Phase 6.6: Production CSRF Protection Middleware
 *
 * Implements Double-Submit Cookie & Origin Validation CSRF defense.
 * Protects cookie-authenticated state-changing endpoints against cross-site request forgery.
 *
 * Features:
 * - Safe HTTP methods (GET, HEAD, OPTIONS) bypass verification.
 * - Pure Bearer-token API calls without cookies bypass verification (immune to browser ambient credential CSRF).
 * - Cookie-authenticated requests must provide a valid matching X-CSRF-Token header.
 * - Strict Origin / Referer validation against configured allowed origins.
 */

const crypto = require('crypto');
const { getAllowedOrigins, isProduction } = require('../config/environment');
const { CSRF_COOKIE_NAME, COOKIE_NAME, getCsrfCookieOptions } = require('../utils/cookieHelper');
const { logger } = require('../utils/logger');

/**
 * Generates a high-entropy 256-bit CSRF token.
 * @returns {string} Hex-encoded token
 */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Express handler for GET /api/auth/csrf-token.
 * Issues a fresh CSRF token and sets the client-readable cookie.
 */
function csrfEndpoint(req, res) {
  const token = generateCsrfToken();
  const options = getCsrfCookieOptions();
  res.cookie(CSRF_COOKIE_NAME, token, options);
  return res.status(200).json({
    success: true,
    csrfToken: token
  });
}

/**
 * Constant-time string equality comparison to prevent timing attacks.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * CSRF Protection Middleware
 */
function csrfProtection(req, res, next) {
  // 1. Safe HTTP methods do not alter state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method.toUpperCase())) {
    return next();
  }

  const hasAuthCookie = Boolean(req.cookies && (req.cookies[COOKIE_NAME] || req.cookies[CSRF_COOKIE_NAME]));
  const hasAuthHeader = Boolean(req.headers.authorization || req.headers.Authorization);
  const isApiBodyRefresh = Boolean(!hasAuthCookie && req.body && req.body.refreshToken);

  // 2. Pure API requests (Bearer tokens or explicit body refresh without ambient cookies)
  // are immune to ambient browser credential CSRF.
  if ((!hasAuthCookie && hasAuthHeader) || isApiBodyRefresh) {
    return next();
  }

  // 3. Validate Origin / Referer against allowed origins
  const origin = req.headers.origin || req.headers.referer;
  if (origin && typeof origin === 'string') {
    const allowed = getAllowedOrigins();
    const cleanOrigin = origin.trim().replace(/\/+$/, '');

    let originAllowed = false;
    for (const a of allowed) {
      if (cleanOrigin.startsWith(a.replace(/\/+$/, ''))) {
        originAllowed = true;
        break;
      }
    }

    // Allow localhost during development testing
    if (!originAllowed && !isProduction()) {
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(cleanOrigin)) {
        originAllowed = true;
      }
    }

    if (!originAllowed) {
      logger.warn('[CSRF] Request rejected: untrusted origin/referer', {
        origin: cleanOrigin,
        ip: req.ip,
        method: req.method,
        path: req.originalUrl
      });
      try {
        const { recordSecurityEvent } = require('../services/securityMonitoringService');
        recordSecurityEvent({
          eventType: 'origin_validation_failed',
          severity: 'medium',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          requestId: req.requestId,
          metadata: { origin: cleanOrigin, path: req.originalUrl }
        }).catch(() => {});
      } catch (evtErr) {}
      return res.status(403).json({
        success: false,
        message: 'CSRF validation failed: Request origin is not allowed.'
      });
    }
  }

  // 4. Double-Submit Token verification
  const clientCsrfToken =
    req.headers['x-csrf-token'] ||
    req.headers['x-xsrf-token'] ||
    req.body?._csrf;

  const cookieCsrfToken = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : null;

  if (!clientCsrfToken || !cookieCsrfToken) {
    logger.warn('[CSRF] Request rejected: missing CSRF token', {
      hasHeader: Boolean(clientCsrfToken),
      hasCookie: Boolean(cookieCsrfToken),
      path: req.originalUrl,
      method: req.method
    });
    try {
      const { recordSecurityEvent } = require('../services/securityMonitoringService');
      recordSecurityEvent({
        eventType: 'csrf_validation_failed',
        severity: 'low',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
        metadata: { path: req.originalUrl, reason: 'missing_token' }
      }).catch(() => {});
    } catch (evtErr) {}
    return res.status(403).json({
      success: false,
      code: 'CSRF_TOKEN_MISSING',
      message: 'CSRF validation failed: Missing CSRF token.'
    });
  }

  if (!safeEqual(clientCsrfToken, cookieCsrfToken)) {
    logger.warn('[CSRF] Request rejected: CSRF token mismatch', {
      path: req.originalUrl,
      method: req.method
    });
    try {
      const { recordSecurityEvent } = require('../services/securityMonitoringService');
      recordSecurityEvent({
        eventType: 'csrf_validation_failed',
        severity: 'medium',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
        metadata: { path: req.originalUrl, reason: 'token_mismatch' }
      }).catch(() => {});
    } catch (evtErr) {}
    return res.status(403).json({
      success: false,
      code: 'CSRF_TOKEN_MISMATCH',
      message: 'CSRF validation failed: Invalid CSRF token.'
    });
  }

  return next();
}

module.exports = {
  generateCsrfToken,
  csrfEndpoint,
  csrfProtection,
  safeEqual
};
