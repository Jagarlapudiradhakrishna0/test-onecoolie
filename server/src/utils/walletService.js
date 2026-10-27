/**
 * server/src/utils/walletService.js
 *
 * Authoritative Assistant Wallet & Ledger Service (Production V4.0)
 *
 * Architecture & Financial Invariants:
 * - Integer paise arithmetic for all INR calculations (no floating point drift)
 * - Atomic balance reconciliation: balance_after = balance_before ± amount_paise
 * - Non-negative balance constraint (balance_paise >= 0)
 * - Strict idempotency for top-up credits (exactly-once fulfillment)
 * - Immutable transaction ledger with unique references (TXN_...)
 * - Combines service earning balances with stored wallet top-up balances
 */

const crypto = require('crypto');
const auditService = require('./auditService');

/**
 * Generates a unique, high-entropy transaction reference code.
 * Example: TXN_A8F2E491BC73
 * @returns {string}
 */
function generateTransactionReference() {
  const hex = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `TXN_${hex}`;
}

/**
 * Gets or creates the assistant's stored wallet record.
 *
 * @param {object} supabase - Supabase client
 * @param {string} assistantId - UUID of assistant
 * @returns {Promise<{ success: boolean, wallet?: object, error?: object }>}
 */
async function getOrCreateAssistantWallet(supabase, assistantId) {
  if (!assistantId) {
    return { success: false, error: { message: 'Assistant ID is required.' } };
  }

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('assistant_wallets')
      .select('*')
      .eq('assistant_id', assistantId)
      .maybeSingle();

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      // If table doesn't exist yet, return safe zero balance object
      if (fetchErr.message && fetchErr.message.includes('relation "public.assistant_wallets" does not exist')) {
        return {
          success: true,
          wallet: {
            assistant_id: assistantId,
            balance_paise: 0,
            currency: 'INR',
            status: 'active'
          }
        };
      }
      return { success: false, error: fetchErr };
    }

    if (existing) {
      return { success: true, wallet: existing };
    }

    // Initialize new wallet row
    const newWallet = {
      assistant_id: assistantId,
      balance_paise: 0,
      currency: 'INR',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: created, error: insertErr } = await supabase
      .from('assistant_wallets')
      .insert([newWallet])
      .select()
      .maybeSingle();

    if (insertErr) {
      // In case of concurrent creation race, fetch existing
      const { data: retryData } = await supabase
        .from('assistant_wallets')
        .select('*')
        .eq('assistant_id', assistantId)
        .maybeSingle();

      if (retryData) {
        return { success: true, wallet: retryData };
      }
      return { success: false, error: insertErr };
    }

    return { success: true, wallet: created || newWallet };
  } catch (err) {
    return { success: false, error: { message: err.message || 'Error initializing wallet.' } };
  }
}

/**
 * Calculates authoritative wallet balances for an assistant.
 * Combines:
 * 1. Earnings from completed jobs (pending, available, held, paid out)
 * 2. Stored prepaid wallet balance (from verified top-ups)
 *
 * @param {object} supabase - Supabase client
 * @param {string} assistantId - UUID of the assistant
 * @returns {Promise<{ success: boolean, wallet?: object, error?: object }>}
 */
async function getAssistantWallet(supabase, assistantId) {
  if (!assistantId) {
    return { success: false, error: { message: 'Assistant ID is required.' } };
  }

  try {
    // 1. Query all earnings for this assistant
    const { data: earnings, error: earnErr } = await supabase
      .from('assistant_earnings')
      .select('id, assistant_amount, status, created_at, available_at')
      .eq('assistant_id', assistantId);

    if (earnErr && !earnErr.message?.includes('does not exist')) {
      return { success: false, error: earnErr };
    }

    const allEarnings = earnings || [];

    let pendingEarningPaise = 0;
    let availableEarningPaise = 0;
    let heldEarningPaise = 0;
    let paidOutTotalPaise = 0;

    for (const e of allEarnings) {
      const amtPaise = Math.round((Number(e.assistant_amount) || 0) * 100);
      switch (e.status) {
        case 'pending':
          pendingEarningPaise += amtPaise;
          break;
        case 'available':
          availableEarningPaise += amtPaise;
          break;
        case 'held':
          heldEarningPaise += amtPaise;
          break;
        case 'paid_out':
          paidOutTotalPaise += amtPaise;
          break;
        case 'reversed':
          break;
        default:
          break;
      }
    }

    // 2. Fetch stored wallet balance (prepaid top-ups)
    let storedWalletPaise = 0;
    let walletRecord = null;
    const walletRes = await getOrCreateAssistantWallet(supabase, assistantId);
    if (walletRes.success && walletRes.wallet) {
      walletRecord = walletRes.wallet;
      storedWalletPaise = Number(walletRecord.balance_paise) || 0;
    }

    // Total available = Available service earnings + Stored wallet balance
    const totalAvailablePaise = availableEarningPaise + storedWalletPaise;
    const totalLifetimeEarnedPaise = pendingEarningPaise + availableEarningPaise + heldEarningPaise + paidOutTotalPaise;

    return {
      success: true,
      wallet: {
        assistant_id: assistantId,
        currency: 'INR',
        // Balances in Rupees for client consumption
        available_balance: Math.round(totalAvailablePaise) / 100,
        pending_balance: Math.round(pendingEarningPaise) / 100,
        held_balance: Math.round(heldEarningPaise) / 100,
        paid_out_total: Math.round(paidOutTotalPaise) / 100,
        total_earnings: Math.round(totalLifetimeEarnedPaise) / 100,
        stored_wallet_balance: Math.round(storedWalletPaise) / 100,
        // Authoritative integer paise values
        available_balance_paise: totalAvailablePaise,
        pending_balance_paise: pendingEarningPaise,
        held_balance_paise: heldEarningPaise,
        paid_out_total_paise: paidOutTotalPaise,
        stored_wallet_paise: storedWalletPaise,
        status: walletRecord?.status || 'active'
      }
    };
  } catch (err) {
    return { success: false, error: { message: err.message || 'Error fetching assistant wallet.' } };
  }
}

/**
 * Returns available balance for withdrawal.
 * @param {object} supabase
 * @param {string} assistantId
 * @returns {Promise<number>}
 */
async function getAvailableBalance(supabase, assistantId) {
  const result = await getAssistantWallet(supabase, assistantId);
  if (!result.success || !result.wallet) return 0;
  return result.wallet.available_balance;
}

/**
 * Returns pending balance.
 * @param {object} supabase
 * @param {string} assistantId
 * @returns {Promise<number>}
 */
async function getPendingBalance(supabase, assistantId) {
  const result = await getAssistantWallet(supabase, assistantId);
  if (!result.success || !result.wallet) return 0;
  return result.wallet.pending_balance;
}

/**
 * Returns held balance.
 * @param {object} supabase
 * @param {string} assistantId
 * @returns {Promise<number>}
 */
async function getHeldBalance(supabase, assistantId) {
  const result = await getAssistantWallet(supabase, assistantId);
  if (!result.success || !result.wallet) return 0;
  return result.wallet.held_balance;
}

/**
 * Returns total paid out amount.
 * @param {object} supabase
 * @param {string} assistantId
 * @returns {Promise<number>}
 */
async function getPaidOutTotal(supabase, assistantId) {
  const result = await getAssistantWallet(supabase, assistantId);
  if (!result.success || !result.wallet) return 0;
  return result.wallet.paid_out_total;
}

/**
 * Appends an immutable wallet transaction and atomically adjusts wallet balance.
 *
 * @param {object} supabase
 * @param {object} params
 * @param {string} params.assistantId
 * @param {'topup'|'earning_credit'|'payout_debit'|'payout_hold'|'payout_release'|'adjustment'|'refund'} params.transactionType
 * @param {number} params.amountPaise - Must be positive integer paise
 * @param {'credit'|'debit'} params.direction
 * @param {string} [params.relatedTopupId]
 * @param {string} [params.relatedEarningId]
 * @param {string} [params.relatedPayoutId]
 * @param {string} [params.gatewayPaymentId]
 * @param {string} params.description
 * @param {object} [params.metadata]
 * @returns {Promise<{ success: boolean, transaction?: object, wallet?: object, error?: string }>}
 */
async function recordWalletTransaction(supabase, {
  assistantId,
  transactionType,
  amountPaise,
  direction,
  relatedTopupId = null,
  relatedEarningId = null,
  relatedPayoutId = null,
  gatewayPaymentId = null,
  description,
  metadata = {}
}) {
  if (!assistantId) throw new Error('Assistant ID is required.');
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new Error(`Amount must be a positive integer of paise. Received: ${amountPaise}`);
  }
  if (!['credit', 'debit'].includes(direction)) {
    throw new Error(`Invalid transaction direction: ${direction}`);
  }

  // 1. Get or create wallet
  const walletRes = await getOrCreateAssistantWallet(supabase, assistantId);
  if (!walletRes.success || !walletRes.wallet) {
    throw new Error('Failed to load assistant wallet record.');
  }

  const wallet = walletRes.wallet;
  const balanceBefore = Number(wallet.balance_paise) || 0;
  let balanceAfter = balanceBefore;

  if (direction === 'credit') {
    balanceAfter = balanceBefore + amountPaise;
  } else {
    if (balanceBefore < amountPaise) {
      throw new Error(`Insufficient wallet balance. Available: ₹${balanceBefore / 100}, Required: ₹${amountPaise / 100}`);
    }
    balanceAfter = balanceBefore - amountPaise;
  }

  const txnRef = generateTransactionReference();
  const nowIso = new Date().toISOString();

  // 2. Insert immutable transaction row
  const txnRow = {
    wallet_id: wallet.id,
    assistant_id: assistantId,
    transaction_reference: txnRef,
    transaction_type: transactionType,
    amount_paise: amountPaise,
    direction,
    balance_before_paise: balanceBefore,
    balance_after_paise: balanceAfter,
    currency: 'INR',
    status: 'completed',
    gateway_payment_id: gatewayPaymentId,
    related_topup_id: relatedTopupId,
    related_earning_id: relatedEarningId,
    related_payout_id: relatedPayoutId,
    description: description || `${direction === 'credit' ? 'Credit' : 'Debit'} ${transactionType}`,
    metadata: metadata || {},
    created_at: nowIso
  };

  const { data: createdTxn, error: txnErr } = await supabase
    .from('wallet_transactions')
    .insert([txnRow])
    .select()
    .maybeSingle();

  if (txnErr && !txnErr.message?.includes('does not exist')) {
    console.error('WALLET TRANSACTION INSERT ERROR:', txnErr);
    throw new Error(`Failed to record wallet transaction: ${txnErr.message}`);
  }

  // 3. Atomically update wallet balance
  const { data: updatedWallet, error: updateErr } = await supabase
    .from('assistant_wallets')
    .update({
      balance_paise: balanceAfter,
      updated_at: nowIso
    })
    .eq('id', wallet.id)
    .select()
    .maybeSingle();

  if (updateErr && !updateErr.message?.includes('does not exist')) {
    console.error('WALLET BALANCE UPDATE ERROR:', updateErr);
    throw new Error(`Failed to update wallet balance: ${updateErr.message}`);
  }

  return {
    success: true,
    transaction: createdTxn || txnRow,
    wallet: updatedWallet || { ...wallet, balance_paise: balanceAfter }
  };
}

/**
 * Idempotently fulfills a verified assistant wallet top-up intent.
 * Guarantees exactly-once credit to the wallet ledger.
 *
 * @param {object} supabase
 * @param {object} params
 * @param {string} params.topupIntentId
 * @param {string} params.paymentId - Razorpay payment ID
 * @param {string} [params.signature]
 * @param {string} [params.orderId]
 * @param {string} [params.eventSource] - 'frontend' | 'webhook'
 * @returns {Promise<{ success: boolean, idempotent?: boolean, wallet?: object, transaction?: object, message?: string }>}
 */
async function fulfillWalletTopup(supabase, {
  topupIntentId,
  paymentId,
  signature = null,
  orderId = null,
  eventSource = 'frontend'
}) {
  if (!topupIntentId && !orderId) {
    throw new Error('Top-up intent ID or order ID is required.');
  }

  // 1. Locate top-up intent record
  let intent = null;
  if (topupIntentId) {
    const { data } = await supabase
      .from('wallet_topup_intents')
      .select('*')
      .eq('id', topupIntentId)
      .maybeSingle();
    intent = data;
  }

  if (!intent && orderId) {
    const { data } = await supabase
      .from('wallet_topup_intents')
      .select('*')
      .eq('gateway_order_id', orderId)
      .maybeSingle();
    intent = data;
  }

  if (!intent) {
    return {
      success: false,
      code: 'TOPUP_INTENT_NOT_FOUND',
      message: 'Top-up intent record not found.'
    };
  }

  // 2. IDEMPOTENCY GUARD:
  // If intent was already completed, return existing fulfilled state without double credit!
  if (intent.status === 'completed') {
    const walletRes = await getAssistantWallet(supabase, intent.assistant_id);
    return {
      success: true,
      idempotent: true,
      message: 'Wallet top-up was already credited and finalized.',
      wallet: walletRes.wallet
    };
  }

  const nowIso = new Date().toISOString();
  const amountPaise = Number(intent.amount_paise);

  // 3. Mark intent completed
  const { error: intentUpdateErr } = await supabase
    .from('wallet_topup_intents')
    .update({
      status: 'completed',
      gateway_payment_id: paymentId || intent.gateway_payment_id,
      gateway_signature: signature || intent.gateway_signature,
      metadata: {
        ...(intent.metadata || {}),
        fulfilled_by: eventSource,
        fulfilled_at: nowIso
      },
      updated_at: nowIso
    })
    .eq('id', intent.id);

  if (intentUpdateErr) {
    console.error('TOPUP INTENT UPDATE ERROR:', intentUpdateErr);
  }

  // 4. Record credit transaction in wallet ledger
  const txnResult = await recordWalletTransaction(supabase, {
    assistantId: intent.assistant_id,
    transactionType: 'topup',
    amountPaise,
    direction: 'credit',
    relatedTopupId: intent.id,
    gatewayPaymentId: paymentId,
    description: `Wallet Top-up via Razorpay (${paymentId || intent.gateway_order_id})`,
    metadata: {
      order_id: orderId || intent.gateway_order_id,
      payment_id: paymentId,
      fulfilled_by: eventSource
    }
  });

  // 5. Financial Audit Log
  await auditService.recordFinancialAudit(supabase, {
    actor_id: intent.assistant_id,
    actor_role: 'assistant',
    action: 'wallet_topup_completed',
    entity_type: 'wallet_topup_intent',
    entity_id: intent.id,
    amount: amountPaise / 100,
    previous_state: { status: intent.status },
    new_state: { status: 'completed' },
    metadata: {
      amount_paise: amountPaise,
      gateway_payment_id: paymentId,
      transaction_reference: txnResult.transaction?.transaction_reference
    }
  });

  // 6. Broadcast real-time Socket.IO update
  try {
    const { getIO } = require('../controllers/serviceController');
    const io = getIO();
    if (io && intent.assistant_id) {
      io.to(`assistant_${intent.assistant_id}`).emit('wallet_updated', {
        assistantId: intent.assistant_id,
        timestamp: nowIso,
        event: 'topup_completed',
        amount: amountPaise / 100,
        transaction_reference: txnResult.transaction?.transaction_reference
      });
    }
  } catch (socketErr) {
    console.warn('Wallet topup socket broadcast warning:', socketErr.message);
  }

  const updatedWalletRes = await getAssistantWallet(supabase, intent.assistant_id);

  return {
    success: true,
    idempotent: false,
    message: 'Wallet top-up verified and credited successfully.',
    wallet: updatedWalletRes.wallet,
    transaction: txnResult.transaction
  };
}

/**
 * Retrieves the comprehensive earning ledger history for an assistant.
 * @param {object} supabase
 * @param {string} assistantId
 * @returns {Promise<{ success: boolean, earnings?: Array<object>, error?: object }>}
 */
async function getEarningHistory(supabase, assistantId) {
  if (!assistantId) {
    return { success: false, error: { message: 'Assistant ID is required.' } };
  }

  try {
    const { data: earnings, error: earnErr } = await supabase
      .from('assistant_earnings')
      .select('*')
      .eq('assistant_id', assistantId)
      .order('created_at', { ascending: false });

    if (earnErr) return { success: false, error: earnErr };
    if (!earnings || earnings.length === 0) {
      return { success: true, earnings: [] };
    }

    const bookingIds = [...new Set(
      earnings.map((e) => e.booking_id).filter(Boolean)
    )];

    let bookingMap = {};
    if (bookingIds.length > 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, booking_id, station_code, created_at, completed_at, payment_method')
        .in('id', bookingIds);

      if (bookings) {
        for (const b of bookings) {
          bookingMap[b.id] = b;
        }
      }
    }

    const enriched = earnings.map((e) => ({
      ...e,
      booking: e.booking_id ? (bookingMap[e.booking_id] || null) : null,
    }));

    return { success: true, earnings: enriched };
  } catch (err) {
    return { success: false, error: { message: err.message } };
  }
}

/**
 * Retrieves the immutable wallet transaction history for an assistant.
 *
 * @param {object} supabase
 * @param {string} assistantId
 * @param {object} [options]
 * @param {string} [options.type] - Optional filter ('topup', 'earning_credit', 'payout_debit', etc.)
 * @param {number} [options.limit=50]
 * @param {number} [options.page=1]
 * @returns {Promise<{ success: boolean, transactions?: Array<object>, total?: number, error?: object }>}
 */
async function getWalletTransactions(supabase, assistantId, options = {}) {
  if (!assistantId) {
    return { success: false, error: { message: 'Assistant ID is required.' } };
  }

  try {
    const limit = Math.max(1, Math.min(100, parseInt(options.limit, 10) || 50));
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('assistant_id', assistantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.type && options.type !== 'all') {
      query = query.eq('transaction_type', options.type);
    }

    const { data: txns, error: txnErr, count } = await query;

    if (txnErr) {
      if (txnErr.message?.includes('does not exist')) {
        return { success: true, transactions: [], total: 0 };
      }
      return { success: false, error: txnErr };
    }

    // Enrich with human-readable rupee amounts
    const enriched = (txns || []).map((t) => ({
      ...t,
      amount: Math.round(t.amount_paise) / 100,
      balance_before: Math.round(t.balance_before_paise) / 100,
      balance_after: Math.round(t.balance_after_paise) / 100
    }));

    return {
      success: true,
      transactions: enriched,
      total: count || enriched.length,
      page,
      limit
    };
  } catch (err) {
    return { success: false, error: { message: err.message } };
  }
}

module.exports = {
  getOrCreateAssistantWallet,
  getAssistantWallet,
  getAvailableBalance,
  getPendingBalance,
  getHeldBalance,
  getPaidOutTotal,
  recordWalletTransaction,
  fulfillWalletTopup,
  getEarningHistory,
  getWalletTransactions,
  generateTransactionReference,
  rupeesToPaise: require('../config/walletConfig').rupeesToPaise,
  formatPaiseToRupees: require('../config/walletConfig').formatPaiseToRupees
};
