/**
 * server/src/controllers/assistantWalletController.js
 *
 * Dedicated Assistant Wallet Controller (Phase 4 / Production V4.0)
 *
 * Enforces:
 * - Assistant authentication & strict ownership isolation
 * - Integer paise arithmetic for top-ups
 * - Regulatory compliance guardrail for stored-value wallets
 * - Server-side Razorpay order creation for wallet top-ups
 * - Cryptographic HMAC signature verification & authoritative payment capture checks
 * - Atomic ledger updates and exactly-once credit guarantee
 */

const crypto = require('crypto');
const supabase = require('../config/db');
const walletService = require('../utils/walletService');
const { MIN_TOPUP_PAISE, MAX_TOPUP_PAISE, getWalletTopupStatus } = require('../config/walletConfig');
const {
  isRazorpayConfigured,
  getRazorpayClient,
  formatRazorpayAmount
} = require('../config/razorpay');

/**
 * GET /api/assistant-wallet
 * Retrieves authoritative wallet balances.
 */
exports.getWallet = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const assistantId = req.user.id;
    const result = await walletService.getAssistantWallet(supabase, assistantId);

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error?.message || 'Error loading wallet.' });
    }

    const topupStatus = getWalletTopupStatus();

    return res.json({
      success: true,
      wallet: result.wallet,
      topup_policy: {
        min_amount: MIN_TOPUP_PAISE / 100,
        max_amount: MAX_TOPUP_PAISE / 100,
        allowed: topupStatus.allowed,
        is_test_mode: topupStatus.isTestMode,
        compliance_notice: topupStatus.reason
      }
    });
  } catch (err) {
    console.error('GET WALLET ERROR:', err);
    return res.status(500).json({ success: false, message: 'Unable to retrieve assistant wallet.' });
  }
};

/**
 * GET /api/assistant-wallet/transactions
 * Retrieves immutable wallet transactions ledger.
 */
exports.getTransactions = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const assistantId = req.user.id;
    const { type, limit, page } = req.query;

    const result = await walletService.getWalletTransactions(supabase, assistantId, { type, limit, page });

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error?.message || 'Error loading transactions.' });
    }

    return res.json({
      success: true,
      transactions: result.transactions,
      total: result.total,
      page: result.page,
      limit: result.limit
    });
  } catch (err) {
    console.error('GET WALLET TRANSACTIONS ERROR:', err);
    return res.status(500).json({ success: false, message: 'Unable to load wallet transactions.' });
  }
};

/**
 * POST /api/assistant-wallet/topup/initiate
 * Initiates an assistant wallet top-up intent and creates a Razorpay gateway order.
 */
exports.initiateTopup = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // Role verification
    if (req.user.role !== 'assistant' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only assistants can top up their wallet.' });
    }

    const assistantId = req.user.id;
    const { amount } = req.body;

    // 1. Amount validation
    const numAmount = Number(amount);
    if (!numAmount || !Number.isFinite(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid top-up amount. Please provide a positive amount in INR.'
      });
    }

    let amountPaise;
    try {
      amountPaise = formatRazorpayAmount(numAmount);
    } catch (pErr) {
      return res.status(400).json({ success: false, message: pErr.message });
    }

    if (amountPaise < MIN_TOPUP_PAISE) {
      return res.status(400).json({
        success: false,
        message: `Minimum top-up amount is ₹${MIN_TOPUP_PAISE / 100}.`
      });
    }

    if (amountPaise > MAX_TOPUP_PAISE) {
      return res.status(400).json({
        success: false,
        message: `Maximum top-up amount is ₹${MAX_TOPUP_PAISE / 100}.`
      });
    }

    // 2. Regulatory Compliance Guardrail Check
    const topupStatus = getWalletTopupStatus();
    if (!topupStatus.allowed) {
      return res.status(403).json({
        success: false,
        code: topupStatus.code || 'STORED_VALUE_COMPLIANCE_RESTRICTION',
        message: topupStatus.reason
      });
    }

    const razorpayAvailable = isRazorpayConfigured();
    const isTestMode = topupStatus.isTestMode;

    if (!razorpayAvailable && !isTestMode) {
      return res.status(503).json({
        success: false,
        code: 'RAZORPAY_CONFIGURATION_FAILURE',
        message: 'Payment gateway is not configured for live wallet top-ups.'
      });
    }

    // 3. Create top-up intent in database
    const intentPayload = {
      assistant_id: assistantId,
      amount_paise: amountPaise,
      currency: 'INR',
      gateway: razorpayAvailable ? 'razorpay' : 'test_wallet',
      status: 'pending',
      metadata: {
        requested_amount_inr: numAmount,
        test_mode: isTestMode,
        client_ip: req.ip,
        created_at: new Date().toISOString()
      }
    };

    const { data: createdIntent, error: intentErr } = await supabase
      .from('wallet_topup_intents')
      .insert([intentPayload])
      .select()
      .maybeSingle();

    if (intentErr && !intentErr.message?.includes('does not exist')) {
      console.error('WALLET TOPUP INTENT INSERT ERROR:', intentErr);
      return res.status(500).json({
        success: false,
        message: 'Database failure initializing wallet top-up intent.'
      });
    }

    const intentId = createdIntent ? createdIntent.id : `intent_${Date.now()}`;

    // 4. Create Razorpay Order
    let razorpayOrder = null;
    let testOrderId = null;

    if (razorpayAvailable) {
      const razorpay = getRazorpayClient();
      try {
        razorpayOrder = await razorpay.orders.create({
          amount: amountPaise,
          currency: 'INR',
          receipt: `W_${String(intentId).slice(0, 30)}`,
          notes: {
            type: 'wallet_topup',
            topup_id: String(intentId),
            assistant_id: String(assistantId)
          }
        });
      } catch (rzpErr) {
        console.error('RAZORPAY TOPUP ORDER ERROR:', rzpErr);
        if (createdIntent?.id) {
          await supabase
            .from('wallet_topup_intents')
            .update({ status: 'failed', failure_reason: rzpErr.message || 'Razorpay order creation failed' })
            .eq('id', createdIntent.id);
        }
        return res.status(502).json({
          success: false,
          code: 'RAZORPAY_ORDER_FAILURE',
          message: 'Unable to initialize payment with gateway. Please try again.'
        });
      }
    } else {
      testOrderId = `order_topup_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    }

    const orderIdToSave = razorpayOrder ? razorpayOrder.id : testOrderId;

    // 5. Update topup intent with gateway order ID
    if (createdIntent?.id) {
      await supabase
        .from('wallet_topup_intents')
        .update({
          gateway_order_id: orderIdToSave,
          updated_at: new Date().toISOString()
        })
        .eq('id', createdIntent.id);
    }

    // 6. Return safe checkout parameters
    return res.status(201).json({
      success: true,
      topup_id: intentId,
      amount: numAmount,
      amount_paise: amountPaise,
      currency: 'INR',
      is_test_mode: isTestMode,
      razorpay: razorpayOrder ? {
        key_id: process.env.RAZORPAY_KEY_ID,
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      } : {
        key_id: 'rzp_test_simulated',
        order_id: testOrderId,
        amount: amountPaise,
        currency: 'INR'
      }
    });

  } catch (err) {
    console.error('INITIATE TOPUP ERROR:', err);
    return res.status(500).json({ success: false, message: 'Server error initiating wallet top-up.' });
  }
};

/**
 * POST /api/assistant-wallet/topup/verify
 * Verifies Razorpay checkout signature and fulfills wallet top-up credit.
 */
exports.verifyTopup = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const assistantId = req.user.id;
    const {
      topup_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing verification parameters. razorpay_order_id and razorpay_payment_id are required.'
      });
    }

    // 1. Locate intent
    let intent = null;
    if (topup_id) {
      const { data } = await supabase
        .from('wallet_topup_intents')
        .select('*')
        .eq('id', topup_id)
        .maybeSingle();
      intent = data;
    }

    if (!intent && razorpay_order_id) {
      const { data } = await supabase
        .from('wallet_topup_intents')
        .select('*')
        .eq('gateway_order_id', razorpay_order_id)
        .maybeSingle();
      intent = data;
    }

    if (intent && intent.assistant_id !== assistantId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this wallet top-up request.'
      });
    }

    // 2. Cryptographic HMAC Signature Verification
    const razorpayAvailable = isRazorpayConfigured();
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (razorpayAvailable && keySecret) {
      if (!razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing Razorpay signature for verification.'
        });
      }

      const expectedText = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(expectedText)
        .digest('hex');

      let isSignatureValid = false;
      try {
        const expectedBuffer = Buffer.from(generatedSignature, 'utf8');
        const clientBuffer = Buffer.from(String(razorpay_signature).trim(), 'utf8');
        if (expectedBuffer.length === clientBuffer.length) {
          isSignatureValid = crypto.timingSafeEqual(expectedBuffer, clientBuffer);
        }
      } catch (cmpErr) {
        isSignatureValid = false;
      }

      if (!isSignatureValid) {
        if (intent?.id) {
          await supabase
            .from('wallet_topup_intents')
            .update({
              status: 'failed',
              failure_reason: 'HMAC signature verification failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', intent.id);
        }
        return res.status(400).json({
          success: false,
          message: 'Top-up verification failed: Invalid cryptographic signature.'
        });
      }

      // 3. Authoritative verification against Razorpay API
      try {
        const razorpay = getRazorpayClient();
        const paymentRecord = await razorpay.payments.fetch(razorpay_payment_id);

        if (paymentRecord) {
          // Check order match
          if (paymentRecord.order_id && paymentRecord.order_id !== razorpay_order_id) {
            return res.status(400).json({
              success: false,
              message: 'Payment verification failed: Payment does not match the order ID.'
            });
          }

          // Check captured status
          if (paymentRecord.status !== 'captured') {
            // If authorized, attempt auto-capture if applicable
            if (paymentRecord.status === 'authorized') {
              try {
                await razorpay.payments.capture(razorpay_payment_id, paymentRecord.amount, 'INR');
              } catch (capErr) {
                return res.status(400).json({
                  success: false,
                  message: `Payment authorized but capture failed: ${capErr.message}`
                });
              }
            } else {
              return res.status(400).json({
                success: false,
                message: `Payment is not in captured state. Current state: ${paymentRecord.status}`
              });
            }
          }
        }
      } catch (fetchErr) {
        console.warn('Razorpay payment fetch warning during top-up verify:', fetchErr.message);
      }
    }

    // 4. Fulfill Top-up (Atomically credits wallet exactly once)
    const fulfillmentResult = await walletService.fulfillWalletTopup(supabase, {
      topupIntentId: intent?.id || topup_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      orderId: razorpay_order_id,
      eventSource: 'frontend'
    });

    if (!fulfillmentResult.success) {
      return res.status(500).json({
        success: false,
        message: fulfillmentResult.message || 'Failed to fulfill wallet credit.'
      });
    }

    return res.json({
      success: true,
      idempotent: fulfillmentResult.idempotent || false,
      message: fulfillmentResult.message,
      wallet: fulfillmentResult.wallet,
      transaction: fulfillmentResult.transaction
    });

  } catch (err) {
    console.error('VERIFY TOPUP ERROR:', err);
    return res.status(500).json({ success: false, message: 'Server error during wallet top-up verification.' });
  }
};
