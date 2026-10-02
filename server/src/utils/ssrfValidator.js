/**
 * server/src/utils/ssrfValidator.js
 *
 * Strict SSRF Protection for Outbound Railway & External APIs
 * Enforces an allowlist of verified official providers.
 * Strictly blocks private IPs, loopback, link-local, and cloud metadata endpoints.
 */

const ALLOWED_TRAIN_API_HOSTS = Object.freeze([
  'irctc-indian-railway-pnr-status.p.rapidapi.com',
  'indianrailways.p.rapidapi.com',
  'irctc1.p.rapidapi.com'
]);

const FORBIDDEN_HOST_PATTERNS = Object.freeze([
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /metadata/i,
  /internal/i,
  /\.local$/i
]);

/**
 * Validates whether a given host is an authorized, safe train API provider.
 * FAILS CLOSED on null, undefined, malformed, or untrusted hosts.
 *
 * @param {string} host
 * @returns {boolean}
 */
function validateTrainHost(host) {
  if (!host || typeof host !== 'string') return false;

  // Clean and normalize hostname
  const cleanHost = host.trim().toLowerCase().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];

  // Check forbidden patterns first
  if (FORBIDDEN_HOST_PATTERNS.some((pattern) => pattern.test(cleanHost))) {
    return false;
  }

  // Must strictly exist in the approved allowlist
  return ALLOWED_TRAIN_API_HOSTS.includes(cleanHost);
}

module.exports = {
  ALLOWED_TRAIN_API_HOSTS,
  validateTrainHost
};
