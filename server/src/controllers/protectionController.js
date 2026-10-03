/**
 * server/src/controllers/protectionController.js
 *
 * Server-authoritative Journey Protection Controller
 * 
 * CORE RULES:
 * 1. Customer price is strictly server-authoritative at ₹0.50 (50 paise in Razorpay).
 * 2. Razorpay payment must be verified cryptographically server-side before activation.
 * 3. Never activate protection simply because the frontend reports success.
 * 4. Maximum 1 active Journey Protection per booking (Idempotency & Partial Unique Index).
 * 5. Strict booking and protection ownership validation (req.user.id must match passenger_id).
 * 6. Pre-launch demonstration wording only — ZERO display or return of any benefit, payout, or coverage amounts.
 * 7. Append-only tamper-evident audit logging for all protection lifecycle events.
 */

const crypto = require('crypto');
const supabase = require('../config/db');
const getSupabase = () => supabase;
const { isRazorpayConfigured, getRazorpayClient, formatRazorpayAmount } = require('../config/razorpay');
const { recordFinancialAudit } = require('../utils/auditService');
const { recordAdminAudit } = require('../services/adminAuditService');
const {
  PROTECTION_CONFIG,
  generateProtectionId,
  PRE_LAUNCH_POLICY_TERMS
} = require('../utils/protectionConfig');

/**
 * Creates or retrieves a pending payment order for Journey Protection (₹0.50 / 50 paise)
 * POST /api/protection/create-order
 */
async function createProtectionOrder(req, res) {
  try {
    const supabase = getSupabase();
    const userId = req.user?.id;
    const { booking_id, terms_accepted } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to add Journey Protection.'
      });
    }

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: 'Valid booking_id is required.'
      });
    }

    // 1. Strict Terms Acceptance Verification
    if (terms_accepted !== true && terms_accepted !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'You must explicitly read and accept the Journey Protection terms before proceeding.'
      });
    }

    // 2. Fetch and verify booking ownership (BOLA/IDOR protection)
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('id, booking_id, passenger_id, booking_status, payment_status, journey_date, train_number, station_code')
      .eq('id', booking_id)
      .maybeSingle();

    if (bErr || !booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    if (booking.passenger_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You do not own this booking.'
      });
    }

    // 3. Eligibility Check: Booking cannot be cancelled, completed, or deleted
    const bStatus = String(booking.booking_status || '').toLowerCase();
    if (['cancelled', 'completed', 'deleted'].includes(bStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot add Journey Protection to a ${bStatus} booking.`
      });
    }

    // 4. Duplicate Check: Ensure no ACTIVE protection already exists for this booking
    const { data: existingActive } = await supabase
      .from('journey_protection')
      .select('id, protection_id, status, price, terms_version, activated_at')
      .eq('booking_id', booking.id)
      .eq('status', PROTECTION_CONFIG.STATUSES.ACTIVE)
      .maybeSingle();

    if (existingActive) {
      return res.status(409).json({
        success: false,
        message: 'Journey Protection is already ACTIVE for this booking.',
        protection: {
          protection_id: existingActive.protection_id,
          status: existingActive.status,
          price: Number(existingActive.price),
          terms_version: existingActive.terms_version,
          activated_at: existingActive.activated_at
        }
      });
    }

    // 5. Server-Authoritative Price: Exactly ₹0.50 (50 paise)
    const priceRupees = PROTECTION_CONFIG.PRICE_INR;
    const amountInPaise = PROTECTION_CONFIG.PRICE_PAISE; // 50 paise

    // Check if an existing pending protection record exists
    const { data: existingPending } = await supabase
      .from('journey_protection')
      .select('*')
      .eq('booking_id', booking.id)
      .eq('passenger_id', userId)
      .eq('status', PROTECTION_CONFIG.STATUSES.PENDING_PAYMENT)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let protectionRecord = existingPending;
    const nowIso = new Date().toISOString();

    if (!protectionRecord) {
      const newProtectionId = generateProtectionId();
      const { data: inserted, error: insErr } = await supabase
        .from('journey_protection')
        .insert({
          protection_id: newProtectionId,
          booking_id: booking.id,
          passenger_id: userId,
          price: priceRupees,
          status: PROTECTION_CONFIG.STATUSES.PENDING_PAYMENT,
          terms_version: PROTECTION_CONFIG.CURRENT_TERMS_VERSION,
          terms_accepted: true,
          terms_accepted_at: nowIso
        })
        .select()
        .single();

      if (insErr) {
        console.error('[PROTECTION] Error inserting protection record:', insErr);
        return res.status(500).json({
          success: false,
          message: 'Unable to initialize Journey Protection record.'
        });
      }
      protectionRecord = inserted;

      // Audit Log: PROTECTION_CREATED & TERMS_ACCEPTED
      await recordFinancialAudit(supabase, {
        actor_id: userId,
        actor_role: req.user.role || 'passenger',
        action: 'PROTECTION_CREATED',
        entity_type: 'payment',
        entity_id: protectionRecord.id,
        booking_id: booking.id,
        amount: priceRupees,
        metadata: {
          protection_id: protectionRecord.protection_id,
          terms_version: PROTECTION_CONFIG.CURRENT_TERMS_VERSION,
          terms_accepted_at: nowIso
        }
      });
    }

    // 6. Razorpay Gateway Order Creation (50 paise)
    const razorpayAvailable = isRazorpayConfigured();
    const paymentMode = (process.env.PAYMENT_MODE || (process.env.NODE_ENV === 'production' ? 'production' : 'test')).toLowerCase();

    if (!razorpayAvailable && paymentMode === 'production') {
      return res.status(503).json({
        success: false,
        message: 'Online payment gateway is temporarily unavailable. Please try again later.'
      });
    }

    let razorpayOrderId = null;
    let razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mock';

    if (razorpayAvailable) {
      const rzp = getRazorpayClient();
      const shortRef = String(booking.booking_id || booking.id).substring(0, 10);
      const rzpOrder = await rzp.orders.create({
        amount: amountInPaise, // 50 paise
        currency: 'INR',
        receipt: `prot_${protectionRecord.protection_id}`,
        notes: {
          booking_id: booking.id,
          booking_ref: booking.booking_id || '',
          protection_id: protectionRecord.protection_id,
          passenger_id: userId,
          product: PROTECTION_CONFIG.PRODUCT_NAME,
          price_inr: '0.50'
        }
      });

      razorpayOrderId = rzpOrder.id;

      // Update gateway_order_id in record
      await supabase
        .from('journey_protection')
        .update({
          gateway_order_id: razorpayOrderId,
          updated_at: nowIso
        })
        .eq('id', protectionRecord.id);
    } else {
      // Test environment fallback order ID for offline dev
      razorpayOrderId = `order_test_${Date.now()}`;
    }

    // Audit Log: PROTECTION_PAYMENT_STARTED
    await recordFinancialAudit(supabase, {
      actor_id: userId,
      actor_role: req.user.role || 'passenger',
      action: 'PROTECTION_PAYMENT_STARTED',
      entity_type: 'payment',
      entity_id: protectionRecord.id,
      booking_id: booking.id,
      amount: priceRupees,
      metadata: {
        protection_id: protectionRecord.protection_id,
        gateway_order_id: razorpayOrderId
      }
    });

    return res.json({
      success: true,
      protection: {
        id: protectionRecord.id,
        protection_id: protectionRecord.protection_id,
        booking_id: booking.id,
        price: priceRupees,
        status: protectionRecord.status,
        terms_version: protectionRecord.terms_version,
        terms_accepted_at: protectionRecord.terms_accepted_at
      },
      razorpay: {
        order_id: razorpayOrderId,
        amount: amountInPaise, // 50 paise
        currency: 'INR',
        key_id: razorpayKeyId
      }
    });

  } catch (err) {
    console.error('[PROTECTION] createProtectionOrder error:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to initialize Journey Protection payment. Please try again.'
    });
  }
}

/**
 * Server-authoritative Razorpay Payment Verification & Protection Activation
 * POST /api/protection/verify-payment
 */
async function verifyProtectionPayment(req, res) {
  try {
    const supabase = getSupabase();
    const userId = req.user?.id;
    const {
      protection_id,
      booking_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing mandatory payment verification signatures.'
      });
    }

    // 1. Locate Protection Record
    let query = supabase.from('journey_protection').select('*');
    if (protection_id) {
      query = query.or(`protection_id.eq.${protection_id},id.eq.${protection_id}`);
    } else if (booking_id) {
      query = query.eq('booking_id', booking_id);
    } else {
      query = query.eq('gateway_order_id', razorpay_order_id);
    }

    const { data: protection, error: pErr } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (pErr || !protection) {
      return res.status(404).json({
        success: false,
        message: 'Journey Protection record could not be found for verification.'
      });
    }

    // Verify ownership
    if (protection.passenger_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Protection record belongs to another passenger.'
      });
    }

    // 2. Idempotency Check: If already active, return safe idempotent acknowledgement
    if (protection.status === PROTECTION_CONFIG.STATUSES.ACTIVE) {
      return res.json({
        success: true,
        idempotent: true,
        message: 'Journey Protection is already verified and active.',
        protection: {
          protection_id: protection.protection_id,
          status: protection.status,
          price: Number(protection.price),
          terms_version: protection.terms_version,
          activated_at: protection.activated_at
        }
      });
    }

    // 3. Cryptographic Signature Verification
    const razorpayAvailable = isRazorpayConfigured();
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (razorpayAvailable && keySecret) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      let isValid = false;
      try {
        const sigBuffer = Buffer.from(razorpay_signature, 'utf8');
        const genBuffer = Buffer.from(generatedSignature, 'utf8');
        if (sigBuffer.length === genBuffer.length && crypto.timingSafeEqual(sigBuffer, genBuffer)) {
          isValid = true;
        }
      } catch (err) {
        isValid = false;
      }

      if (!isValid) {
        console.warn(`[SECURITY] Invalid Razorpay signature for protection ${protection.protection_id}`);
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed: Invalid cryptographic signature.'
        });
      }
    } else if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        success: false,
        message: 'Server security configuration error during payment verification.'
      });
    }

    // 4. Server-Authoritative Activation
    const nowIso = new Date().toISOString();
    const { data: updatedProtection, error: uErr } = await supabase
      .from('journey_protection')
      .update({
        status: PROTECTION_CONFIG.STATUSES.ACTIVE,
        gateway_order_id: razorpay_order_id,
        gateway_payment_id: razorpay_payment_id,
        activated_at: nowIso,
        updated_at: nowIso
      })
      .eq('id', protection.id)
      .select()
      .single();

    if (uErr) {
      console.error('[PROTECTION] Error activating protection:', uErr);
      return res.status(500).json({
        success: false,
        message: 'Protection could not be activated. Please contact support.'
      });
    }

    // 5. Audit Logging: PROTECTION_PAYMENT_VERIFIED & PROTECTION_ACTIVATED
    await recordFinancialAudit(supabase, {
      actor_id: userId,
      actor_role: req.user.role || 'passenger',
      action: 'PROTECTION_PAYMENT_VERIFIED',
      entity_type: 'payment',
      entity_id: updatedProtection.id,
      booking_id: updatedProtection.booking_id,
      amount: PROTECTION_CONFIG.PRICE_INR,
      metadata: {
        protection_id: updatedProtection.protection_id,
        gateway_order_id: razorpay_order_id,
        gateway_payment_id: razorpay_payment_id
      }
    });

    await recordFinancialAudit(supabase, {
      actor_id: userId,
      actor_role: req.user.role || 'passenger',
      action: 'PROTECTION_ACTIVATED',
      entity_type: 'payment',
      entity_id: updatedProtection.id,
      booking_id: updatedProtection.booking_id,
      amount: PROTECTION_CONFIG.PRICE_INR,
      metadata: {
        protection_id: updatedProtection.protection_id,
        status: 'active',
        activated_at: nowIso,
        terms_version: updatedProtection.terms_version
      }
    });

    return res.json({
      success: true,
      message: 'Journey Protection activated successfully.',
      protection: {
        id: updatedProtection.id,
        protection_id: updatedProtection.protection_id,
        booking_id: updatedProtection.booking_id,
        status: updatedProtection.status,
        price: Number(updatedProtection.price),
        activated_at: updatedProtection.activated_at,
        terms_version: updatedProtection.terms_version,
        terms_accepted_at: updatedProtection.terms_accepted_at
      }
    });

  } catch (err) {
    console.error('[PROTECTION] verifyProtectionPayment error:', err);
    return res.status(500).json({
      success: false,
      message: 'Protection verification encountered an internal error.'
    });
  }
}

/**
 * Gets Journey Protection details for a specific booking
 * GET /api/protection/booking/:bookingId
 */
async function getProtectionForBooking(req, res) {
  try {
    const supabase = getSupabase();
    const userId = req.user?.id;
    const { bookingId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'bookingId parameter is required.'
      });
    }

    // 1. Fetch booking to check ownership
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('id, passenger_id')
      .or(`id.eq.${bookingId},booking_id.eq.${bookingId}`)
      .maybeSingle();

    if (bErr || !booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    if (booking.passenger_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Booking belongs to another passenger.'
      });
    }

    // 2. Fetch Journey Protection (favoring active status)
    const { data: protections, error: pErr } = await supabase
      .from('journey_protection')
      .select('id, protection_id, booking_id, passenger_id, price, status, terms_version, terms_accepted, terms_accepted_at, activated_at, created_at')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: false });

    if (pErr) {
      return res.status(500).json({
        success: false,
        message: 'Unable to load Journey Protection. Please try again.'
      });
    }

    if (!protections || protections.length === 0) {
      return res.json({
        success: true,
        protection: null,
        message: 'No Journey Protection has been added to this booking.'
      });
    }

    // Find active protection or latest pending
    const active = protections.find(p => p.status === 'active') || protections[0];

    // Sanitized passenger response: NEVER include internal benefit amounts or secret configurations
    return res.json({
      success: true,
      protection: {
        id: active.id,
        protection_id: active.protection_id,
        booking_id: active.booking_id,
        price: Number(active.price),
        status: active.status,
        terms_version: active.terms_version,
        terms_accepted_at: active.terms_accepted_at,
        activated_at: active.activated_at,
        created_at: active.created_at
      }
    });

  } catch (err) {
    console.error('[PROTECTION] getProtectionForBooking error:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to load Journey Protection. Please try again.'
    });
  }
}

/**
 * Returns Versioned Pre-Launch Policy Terms
 * GET /api/protection/terms
 * GET /api/protection/:protectionId/terms
 */
async function getProtectionTerms(req, res) {
  try {
    return res.json({
      success: true,
      terms: PRE_LAUNCH_POLICY_TERMS
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve policy terms.'
    });
  }
}

/**
 * Cancels Journey Protection (following configured cancellation rules)
 * POST /api/protection/:protectionId/cancel
 */
async function cancelProtection(req, res) {
  try {
    const supabase = getSupabase();
    const userId = req.user?.id;
    const { protectionId } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { data: protection, error: pErr } = await supabase
      .from('journey_protection')
      .select('*')
      .or(`protection_id.eq.${protectionId},id.eq.${protectionId}`)
      .maybeSingle();

    if (pErr || !protection) {
      return res.status(404).json({ success: false, message: 'Protection record not found.' });
    }

    if (protection.passenger_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (protection.status === 'cancelled') {
      return res.json({ success: true, message: 'Protection is already cancelled.', protection });
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: uErr } = await supabase
      .from('journey_protection')
      .update({
        status: PROTECTION_CONFIG.STATUSES.CANCELLED,
        updated_at: nowIso
      })
      .eq('id', protection.id)
      .select()
      .single();

    if (uErr) {
      return res.status(500).json({ success: false, message: 'Failed to cancel Journey Protection.' });
    }

    await recordFinancialAudit(supabase, {
      actor_id: userId,
      actor_role: req.user.role || 'passenger',
      action: 'PROTECTION_CANCELLED',
      entity_type: 'payment',
      entity_id: updated.id,
      booking_id: updated.booking_id,
      amount: Number(updated.price),
      metadata: {
        protection_id: updated.protection_id,
        reason: reason || 'Passenger requested cancellation'
      }
    });

    return res.json({
      success: true,
      message: 'Journey Protection has been cancelled.',
      protection: {
        protection_id: updated.protection_id,
        status: updated.status,
        price: Number(updated.price)
      }
    });

  } catch (err) {
    console.error('[PROTECTION] cancelProtection error:', err);
    return res.status(500).json({ success: false, message: 'Unable to cancel protection.' });
  }
}

/**
 * Admin: List all Journey Protection records with passenger & booking telemetry
 * GET /api/protection/admin/list
 */
async function getAdminProtections(req, res) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required.'
      });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('journey_protection')
      .select(`
        id,
        protection_id,
        booking_id,
        passenger_id,
        price,
        status,
        gateway_order_id,
        gateway_payment_id,
        terms_version,
        terms_accepted_at,
        activated_at,
        created_at,
        users:passenger_id (id, name, email, phone),
        bookings:booking_id (id, booking_id, train_number, station_code, journey_date)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[ADMIN] Error fetching protections:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load protection records.'
      });
    }

    return res.json({
      success: true,
      protections: data || []
    });

  } catch (err) {
    console.error('[ADMIN] getAdminProtections error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load protection records.'
    });
  }
}

module.exports = {
  createProtectionOrder,
  verifyProtectionPayment,
  getProtectionForBooking,
  getProtectionTerms,
  cancelProtection,
  getAdminProtections
};
