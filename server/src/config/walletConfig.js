/**
 * server/src/config/walletConfig.js
 *
 * Centralized Assistant Wallet Configuration & Regulatory Compliance Guardrails.
 *
 * Compliance Note (Fintech / Indian Regulations):
 * Storing prepaid customer/assistant funds into a closed or semi-closed wallet
 * is subject to RBI Master Directions on Prepaid Payment Instruments (PPI).
 * Razorpay accounts must be specifically approved and configured for wallet/escrow capabilities.
 *
 * This configuration strictly enforces that live stored-value top-ups remain disabled
 * in production unless ENABLE_LIVE_WALLET_TOPUPS=true is explicitly configured with
 * verified account approval.
 */

const MIN_TOPUP_PAISE = 10000;   // ₹100.00
const MAX_TOPUP_PAISE = 5000000; // ₹50,000.00

/**
 * Accurately converts rupee amount (number or string) into integer paise.
 * Clamps negative amounts to 0.
 *
 * @param {number|string} rupees
 * @returns {number} integer paise
 */
function rupeesToPaise(rupees) {
  const parsed = parseFloat(rupees);
  if (isNaN(parsed) || parsed <= 0) return 0;
  return Math.round(parsed * 100);
}

/**
 * Formats integer paise into standard 2-decimal INR currency string.
 *
 * @param {number} paise
 * @returns {string} e.g. "100.50"
 */
function formatPaiseToRupees(paise) {
  const p = Math.max(0, parseInt(paise, 10) || 0);
  return (p / 100).toFixed(2);
}

/**
 * Checks whether live wallet top-ups are permitted in the current environment.
 * Accepts optional options object to allow precise testing.
 *
 * @param {object} [options]
 * @returns {{ allowed: boolean, permitted: boolean, isTestMode: boolean, test_mode: boolean, code?: string, reason?: string, message?: string }}
 */
function getWalletTopupStatus(options = {}) {
  const nodeEnv = (options.nodeEnv || process.env.NODE_ENV || 'development').toLowerCase();
  const paymentMode = (options.paymentMode || process.env.PAYMENT_MODE || (nodeEnv === 'production' ? 'production' : 'test')).toLowerCase();
  const isTestKey = options.isTestKey !== undefined ? options.isTestKey : (process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test') || false);
  const isTestMode = isTestKey || paymentMode === 'test' || nodeEnv !== 'production';

  // If in test/development mode, top-ups can be tested safely with Razorpay Test Mode
  if (isTestMode) {
    return {
      allowed: true,
      permitted: true,
      isTestMode: true,
      test_mode: true,
      reason: 'Test mode enabled for assistant wallet top-up verification.',
      message: 'Test mode enabled for assistant wallet top-up verification.'
    };
  }

  // In production: Requires explicit approval flag
  const liveTopupsApproved = options.enableLiveWalletTopups !== undefined
    ? Boolean(options.enableLiveWalletTopups)
    : process.env.ENABLE_LIVE_WALLET_TOPUPS === 'true';

  if (!liveTopupsApproved) {
    const reasonMsg = 'Assistant wallet stored-value top-up is currently disabled pending Razorpay merchant account PPI compliance approval under RBI Master Directions on Prepaid Payment Instruments.';
    return {
      allowed: false,
      permitted: false,
      isTestMode: false,
      test_mode: false,
      code: 'PPI_COMPLIANCE_APPROVAL_REQUIRED',
      reason: reasonMsg,
      message: reasonMsg
    };
  }

  return {
    allowed: true,
    permitted: true,
    isTestMode: false,
    test_mode: false,
    reason: 'Live assistant wallet top-up enabled.',
    message: 'Live assistant wallet top-up enabled.'
  };
}

module.exports = {
  MIN_TOPUP_PAISE,
  MAX_TOPUP_PAISE,
  rupeesToPaise,
  formatPaiseToRupees,
  getWalletTopupStatus
};
