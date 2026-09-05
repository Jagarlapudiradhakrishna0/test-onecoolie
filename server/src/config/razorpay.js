/**
 * server/src/config/razorpay.js
 *
 * Centralized Razorpay Gateway Configuration for ONECOOLIE (Phase 2A)
 *
 * Features:
 * - Singleton Razorpay client initialization
 * - Safe credential validation (no server crash if missing in dev)
 * - Strict isolation: RAZORPAY_KEY_SECRET is NEVER returned to client
 * - Precise rupees-to-paise conversion (avoiding float inaccuracies)
 */

const Razorpay = require('razorpay');

let razorpayInstance = null;

/**
 * Checks if Razorpay credentials are fully configured in the environment.
 * @returns {boolean}
 */
function isRazorpayConfigured() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(
    keyId &&
    keySecret &&
    String(keyId).trim() !== '' &&
    String(keySecret).trim() !== '' &&
    !String(keyId).includes('your-razorpay')
  );
}

/**
 * Returns the singleton Razorpay instance.
 * Throws a clean error if credentials are not configured.
 * @returns {Razorpay}
 */
function getRazorpayClient() {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!isRazorpayConfigured()) {
    throw new Error(
      'Razorpay credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env.'
    );
  }

  razorpayInstance = new Razorpay({
    key_id: String(key_id).trim(),
    key_secret: String(key_secret).trim(),
  });

  return razorpayInstance;
}

/**
 * Safely converts an amount in INR (Rupees) into an integer number of paise.
 * Razorpay expects all INR transaction amounts in paise (1 INR = 100 paise).
 *
 * @param {number|string} amountInRupees
 * @returns {number} Integer amount in paise
 */
function formatRazorpayAmount(amountInRupees) {
  const parsed = Number(amountInRupees);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid amount for Razorpay order: ${amountInRupees}`);
  }
  // Math.round eliminates JavaScript floating-point precision artifacts (e.g. 59.99 * 100)
  return Math.round(parsed * 100);
}

/**
 * Resets the cached singleton client (useful for unit tests or reload).
 */
function _resetRazorpayClientForTest() {
  razorpayInstance = null;
}

module.exports = {
  isRazorpayConfigured,
  getRazorpayClient,
  formatRazorpayAmount,
  _resetRazorpayClientForTest
};
