/**
 * server/src/config/adminAllowlist.js
 *
 * ONECOOLIE Strict Two-Account Administrator Access Control
 *
 * Authoritative backend allowlist restricting administrative authentication,
 * MFA enrollment, session creation, protected admin APIs, and admin Socket.IO rooms
 * strictly to approved administrator email identities:
 *   1. admin01@onecoolie.in
 *   2. admin02@onecoolie.in
 *
 * All comparisons are normalized (trimmed, lowercased).
 * Under NO circumstances is this list or identity verification exposed to client-side bundles.
 */

const DEFAULT_APPROVED_ADMINS = Object.freeze([
  'admin01@onecoolie.in',
  'admin02@onecoolie.in'
]);

/**
 * Safely normalizes an email address for identity comparison.
 * Trims leading/trailing whitespace and converts to lower case.
 *
 * @param {string|null|undefined} email
 * @returns {string}
 */
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Returns the current active list of approved administrator emails.
 * Allows environment override via ADMIN_ALLOWLIST (comma-separated),
 * defaulting strictly to the two approved production identities.
 *
 * @returns {string[]}
 */
function getApprovedAdminEmails() {
  const envAllowlist = process.env.ADMIN_ALLOWLIST;
  if (envAllowlist && typeof envAllowlist === 'string' && envAllowlist.trim()) {
    const customList = envAllowlist
      .split(',')
      .map((e) => normalizeEmail(e))
      .filter(Boolean);
    if (customList.length > 0) {
      return customList;
    }
  }
  return [...DEFAULT_APPROVED_ADMINS];
}

/**
 * Evaluates whether an email identity matches the approved administrator allowlist.
 * Fails closed for null, undefined, empty, or malformed inputs.
 *
 * @param {string|null|undefined} email
 * @returns {boolean}
 */
function isApprovedAdminEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const allowed = getApprovedAdminEmails();
  return allowed.includes(normalized);
}

module.exports = {
  DEFAULT_APPROVED_ADMINS,
  normalizeEmail,
  getApprovedAdminEmails,
  isApprovedAdminEmail
};
