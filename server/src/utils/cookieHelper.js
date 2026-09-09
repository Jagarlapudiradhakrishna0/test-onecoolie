/**
 * server/src/utils/cookieHelper.js
 *
 * ONECOOLIE Phase 6.6: Production Cookie Authentication Utility
 *
 * Manages secure, HttpOnly refresh token cookie transport.
 * Guarantees that sensitive opaque refresh tokens are never accessible to client JavaScript,
 * eliminating XSS-based refresh token exfiltration.
 */

const { isProduction } = require('../config/environment');

const COOKIE_NAME = process.env.COOKIE_NAME || 'onecoolie_refresh';
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME || 'onecoolie_csrf';

/**
 * Derives production-safe cookie options for the refresh token.
 *
 * @returns {object} Express cookie options
 */
function getRefreshCookieOptions(isProdOverride) {
  const prod = isProdOverride !== undefined ? Boolean(isProdOverride) : isProduction();

  // In cross-origin production topologies (e.g. frontend on vercel.app, backend on render.com),
  // browsers require SameSite=None and Secure=true for cookies to be sent with credentials.
  // In development, default to 'lax' so localhost HTTP testing operates smoothly without SSL.
  const sameSite = process.env.COOKIE_SAME_SITE || (prod ? 'none' : 'lax');
  const secure = process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === 'true'
    : (prod || sameSite === 'none');

  const options = {
    httpOnly: true,
    secure: Boolean(secure),
    sameSite: sameSite,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days (matches maximum absolute session window)
  };

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
}

/**
 * Attaches the HttpOnly refresh token cookie to the outgoing response.
 *
 * @param {import('express').Response} res
 * @param {string} refreshToken
 */
function setRefreshTokenCookie(res, refreshToken) {
  if (!res || !refreshToken) return;
  const options = getRefreshCookieOptions();
  res.cookie(COOKIE_NAME, refreshToken, options);
}

/**
 * Clears the refresh token cookie upon logout or session revocation.
 *
 * @param {import('express').Response} res
 */
function clearRefreshTokenCookie(res) {
  if (!res) return;
  const options = getRefreshCookieOptions();
  const clearOpts = {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
    domain: options.domain,
    maxAge: 0
  };
  if (typeof res.clearCookie === 'function') {
    res.clearCookie(COOKIE_NAME, clearOpts);
  } else if (typeof res.cookie === 'function') {
    res.cookie(COOKIE_NAME, '', clearOpts);
  }
}

/**
 * Derives cookie options for the readable CSRF double-submit token.
 *
 * @param {boolean} [isProdOverride]
 * @returns {object}
 */
function getCsrfCookieOptions(isProdOverride) {
  const prod = isProdOverride !== undefined ? Boolean(isProdOverride) : isProduction();
  const sameSite = process.env.COOKIE_SAME_SITE || (prod ? 'none' : 'lax');
  const secure = process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === 'true'
    : (prod || sameSite === 'none');

  const options = {
    httpOnly: false, // Must be readable by Axios for Double-Submit pattern
    secure: Boolean(secure),
    sameSite: sameSite,
    path: '/',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  };

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
}

module.exports = {
  COOKIE_NAME,
  CSRF_COOKIE_NAME,
  getRefreshCookieOptions,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getCsrfCookieOptions
};
