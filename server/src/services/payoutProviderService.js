/**
 * server/src/services/payoutProviderService.js
 *
 * ONECOOLIE Assistant Payout & UPI Provider Service
 *
 * Strictly separates Development/Mock Payouts from Production Payouts:
 * - In Development (or when MOCK_PAYOUTS=true): Dispatches mock payouts with explicit
 *   audit flags, safe test identifiers (MOCK_UPI_...), and simulated gateway latency.
 * - In Production: Requires verified RazorpayX / banking provider credentials.
 *   Fails closed (NEVER pretends success) if production payment credentials are not configured.
 */

const crypto = require('crypto');
const { logger } = require('../utils/logger');

/**
 * Checks whether production payout credentials are fully configured.
 * @returns {boolean}
 */
function isProductionPayoutConfigured() {
  const keyId = process.env.RAZORPAYX_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAYX_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
  const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;

  return Boolean(keyId && keySecret && accountNumber);
}

/**
 * Returns payout provider operational status and mode.
 * @returns {{ mode: 'mock'|'production', configured: boolean, provider: string }}
 */
function getPayoutProviderStatus() {
  const isProd = process.env.NODE_ENV === 'production';
  const hasProdCreds = isProductionPayoutConfigured();
  const forceMock = process.env.MOCK_PAYOUTS === 'true';

  if (!isProd || forceMock) {
    return {
      mode: 'mock',
      configured: true,
      provider: 'OneCoolie_Dev_Mock_UPI_Provider'
    };
  }

  return {
    mode: 'production',
    configured: hasProdCreds,
    provider: hasProdCreds ? 'RazorpayX_Live_UPI' : 'Unconfigured_Production_Provider'
  };
}

/**
 * Dispatches an approved payout via the appropriate provider (Mock vs Production).
 *
 * @param {object} params
 * @param {object} params.payout - The assistant_payouts record
 * @param {object} params.assistant - The assistant user record
 * @param {string} [params.actorId] - Admin ID initiating/authorizing disbursement
 * @returns {Promise<{
 *   success: boolean,
 *   payout_reference: string,
 *   gateway_payout_id: string,
 *   status: 'paid'|'processing'|'failed',
 *   mode: 'mock'|'production',
 *   metadata: object,
 *   error?: string
 * }>}
 */
async function executeDisbursement({ payout, assistant, actorId = null }) {
  if (!payout || !payout.id || !payout.amount) {
    throw new Error('Valid payout record is required for disbursement.');
  }

  const providerStatus = getPayoutProviderStatus();

  // -------------------------------------------------------------
  // 1. DEVELOPMENT / MOCK PAYOUT DISPATCH
  // -------------------------------------------------------------
  if (providerStatus.mode === 'mock') {
    logger.info(`[PAYOUT_PROVIDER:MOCK] Executing simulated payout for assistant ${payout.assistant_id}: ₹${payout.amount}`);

    const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    const mockUpiRef = `MOCK_UPI_${Date.now()}_${randomSuffix}`;
    const mockGatewayId = `pout_mock_${crypto.randomUUID().slice(0, 12)}`;

    return {
      success: true,
      status: 'paid',
      payout_reference: mockUpiRef,
      gateway_payout_id: mockGatewayId,
      mode: 'mock',
      metadata: {
        disbursement_provider: 'mock_development_engine',
        disbursed_at: new Date().toISOString(),
        disbursed_by: actorId,
        assistant_upi: assistant?.phone ? `${assistant.phone}@upi` : 'assistant@upi',
        is_mock: true
      }
    };
  }

  // -------------------------------------------------------------
  // 2. PRODUCTION PAYOUT DISPATCH (Fail-Closed Enforcement)
  // -------------------------------------------------------------
  if (!providerStatus.configured) {
    const errorMsg = 'Production Payout Failure: RazorpayX/Banking credentials (RAZORPAYX_ACCOUNT_NUMBER) are not configured on this server. Automatic disbursement halted.';
    logger.error(`[PAYOUT_PROVIDER:PROD_ERROR] ${errorMsg}`);
    return {
      success: false,
      status: 'failed',
      payout_reference: null,
      gateway_payout_id: null,
      mode: 'production',
      error: errorMsg,
      metadata: {
        disbursement_attempted_at: new Date().toISOString(),
        failure_code: 'PROVIDER_NOT_CONFIGURED',
        is_mock: false
      }
    };
  }

  // Live Gateway Integration:
  // When live RazorpayX credentials are provided, invoke live RazorpayX payout API
  try {
    const Razorpay = require('razorpay');
    const razorpayx = new Razorpay({
      key_id: process.env.RAZORPAYX_KEY_ID || process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAYX_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET
    });

    // Enforce live banking API call
    const payoutPayload = {
      account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
      amount: Math.round(Number(payout.amount) * 100), // in paise
      currency: 'INR',
      mode: 'UPI',
      purpose: 'payout',
      fund_account: {
        account_type: 'vpa',
        vpa: {
          address: payout.metadata?.upi_id || `${assistant?.phone || 'assistant'}@upi`
        },
        contact: {
          name: assistant?.name || 'Assistant',
          email: assistant?.email || 'assistant@onecoolie.in',
          contact: assistant?.phone || '+919999999999',
          type: 'vendor'
        }
      },
      queue_if_low_balance: true,
      reference_id: `OC_PAYOUT_${payout.id.slice(0, 8)}`,
      narration: 'OneCoolie Earnings Settlement'
    };

    // Note: Live RazorpayX payout invocation
    const rzpPayout = await razorpayx.payouts.create(payoutPayload);

    return {
      success: true,
      status: rzpPayout.status === 'processed' ? 'paid' : 'processing',
      payout_reference: rzpPayout.utr || rzpPayout.id,
      gateway_payout_id: rzpPayout.id,
      mode: 'production',
      metadata: {
        disbursement_provider: 'razorpayx_live',
        gateway_status: rzpPayout.status,
        utr: rzpPayout.utr || null,
        disbursed_at: new Date().toISOString(),
        disbursed_by: actorId,
        is_mock: false
      }
    };
  } catch (liveErr) {
    logger.error('[PAYOUT_PROVIDER:LIVE_ERROR] Live banking disbursement failed:', liveErr.message || liveErr);
    return {
      success: false,
      status: 'failed',
      payout_reference: null,
      gateway_payout_id: null,
      mode: 'production',
      error: liveErr.message || 'Live banking disbursement gateway error',
      metadata: {
        disbursement_attempted_at: new Date().toISOString(),
        failure_code: 'GATEWAY_DISBURSEMENT_FAILED',
        error_details: liveErr.error?.description || liveErr.message,
        is_mock: false
      }
    };
  }
}

module.exports = {
  isProductionPayoutConfigured,
  getPayoutProviderStatus,
  executeDisbursement
};
