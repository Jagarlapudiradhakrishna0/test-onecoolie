/**
 * server/scripts/investigate_and_recover_refund.js
 *
 * Dedicated Production Refund Inspection & One-Time Safe Recovery Tool
 *
 * USAGE:
 *
 * 1. READ-ONLY INSPECTION (Safe, No writes, No refunds):
 *    node scripts/investigate_and_recover_refund.js inspect <email_or_booking_code_or_order_id>
 *    Example:
 *    node scripts/investigate_and_recover_refund.js inspect 2303a52055@sru.edu.in
 *    node scripts/investigate_and_recover_refund.js inspect RM-MVQVLRM8-EZ35O
 *
 * 2. CONTROLLED RECOVERY REFUND (Only executes for the explicitly specified booking/payment):
 *    node scripts/investigate_and_recover_refund.js recover <booking_code_or_uuid>
 *    Example:
 *    node scripts/investigate_and_recover_refund.js recover RM-MVQVLRM8-EZ35O
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const razorpayConfig = require('../src/config/razorpay');
const { processBookingRefund, getRefundSummaryForPayment } = require('../src/utils/refundService');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect(identifier) {
  console.log(`\n================================================================`);
  console.log(`[INSPECT MODE - READ ONLY] Querying records for: ${identifier}`);
  console.log(`================================================================\n`);

  let bookings = [];

  // Check if identifier is email
  if (identifier.includes('@')) {
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email, phone')
      .eq('email', identifier.trim())
      .maybeSingle();

    if (!user) {
      console.log(`No user found with email: ${identifier}`);
      return;
    }

    console.log(`Found User: ${user.name} (${user.email}) [ID: ${user.id}]`);

    const { data: userBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('passenger_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    bookings = userBookings || [];
  } else {
    // Check by booking code or ID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const query = supabase.from('bookings').select('*');
    if (isUuid) {
      query.eq('id', identifier);
    } else {
      query.eq('booking_id', identifier.trim());
    }
    const { data: bData } = await query;
    bookings = bData || [];
  }

  if (bookings.length === 0) {
    console.log('No matching bookings found.');
    return;
  }

  console.log(`Found ${bookings.length} booking(s):\n`);

  for (let i = 0; i < bookings.length; i++) {
    const b = bookings[i];
    console.log(`----------------------------------------------------------------`);
    console.log(`[${i + 1}] Booking Code: ${b.booking_id} | UUID: ${b.id}`);
    console.log(`    Status: ${b.booking_status} | Payment Status: ${b.payment_status} | Total: ₹${b.total_price}`);
    console.log(`    Method: ${b.payment_method} | Created: ${b.created_at} | Updated: ${b.updated_at}`);
    if (b.services?.cancellation) {
      console.log(`    Cancellation:`, JSON.stringify(b.services.cancellation, null, 2));
    }

    // Look up payment records
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', b.id)
      .order('created_at', { ascending: false });

    if (payments && payments.length > 0) {
      console.log(`    Payment Records (${payments.length}):`);
      for (const p of payments) {
        console.log(`      - Payment ID: ${p.id} | Amount: ₹${p.amount} | Status: ${p.status}`);
        console.log(`        Gateway Order ID: ${p.gateway_order_id || 'NONE'} | Gateway Payment ID: ${p.gateway_payment_id || 'NONE'}`);

        // Check if refunds exist in DB
        const summary = await getRefundSummaryForPayment(supabase, p.id);
        console.log(`        Total Refunded in Ledger: ₹${summary.totalRefunded}`);
        if (summary.processedRefunds.length > 0) {
          console.log(`        Processed Refunds:`, summary.processedRefunds.map(r => `${r.gateway_refund_id || r.id} (₹${r.amount})`));
        }
        if (summary.pendingRefunds.length > 0) {
          console.log(`        Pending Refunds:`, summary.pendingRefunds.map(r => `${r.gateway_refund_id || r.id} (₹${r.amount})`));
        }
        if (summary.failedRefunds.length > 0) {
          console.log(`        Failed Refunds:`, summary.failedRefunds.map(r => `${r.id}: ${r.failure_reason}`));
        }

        // If Razorpay is configured and we have an order ID, fetch live order status
        if (razorpayConfig.isRazorpayConfigured() && p.gateway_order_id) {
          try {
            const razorpay = razorpayConfig.getRazorpayClient();
            const orderPayments = await razorpay.orders.fetchPayments(p.gateway_order_id);
            if (orderPayments && Array.isArray(orderPayments.items)) {
              console.log(`        Authoritative Razorpay Order Payments (${orderPayments.items.length}):`);
              for (const rzpItem of orderPayments.items) {
                console.log(`          * Razorpay Payment ID: ${rzpItem.id} | Status: ${rzpItem.status} | Amount: ₹${rzpItem.amount / 100} | Method: ${rzpItem.method}`);
              }
            }
          } catch (rErr) {
            console.log(`        Razorpay Live Query Notice: ${rErr.message}`);
          }
        }
      }
    } else {
      console.log(`    No payments table record found for this booking.`);
    }
  }
  console.log(`\n================================================================\n`);
}

async function recover(identifier) {
  console.log(`\n================================================================`);
  console.log(`[CONTROLLED RECOVERY MODE] Executing safe refund for: ${identifier}`);
  console.log(`================================================================\n`);

  if (!identifier) {
    console.error('Please specify a booking code or UUID.');
    return;
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  const query = supabase.from('bookings').select('*');
  if (isUuid) {
    query.eq('id', identifier);
  } else {
    query.eq('booking_id', identifier.trim());
  }
  const { data: bookings, error: bErr } = await query;

  if (bErr || !bookings || bookings.length === 0) {
    console.error(`Booking not found: ${identifier}`);
    return;
  }

  const booking = bookings[0];
  console.log(`Loaded Booking: ${booking.booking_id} (UUID: ${booking.id})`);
  console.log(`Status: ${booking.booking_status} | Fare: ₹${booking.total_price}`);

  // Fetch payment record
  const { data: pRows } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', booking.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const payment = pRows && pRows.length > 0 ? pRows[0] : null;
  if (!payment) {
    console.error('No payment record found for this booking.');
    return;
  }

  console.log(`Payment Record: ID=${payment.id}, Status=${payment.status}, OrderId=${payment.gateway_order_id}`);

  // Check idempotency first
  const summary = await getRefundSummaryForPayment(supabase, payment.id);
  if (summary.totalRefunded >= Number(booking.total_price) && summary.totalRefunded > 0) {
    console.log(`[ABORT] This payment has ALREADY been fully refunded: ₹${summary.totalRefunded}. No action taken.`);
    return;
  }

  if (summary.pendingRefunds && summary.pendingRefunds.length > 0) {
    console.log(`[NOTICE] A refund is already pending/processing: ID=${summary.pendingRefunds[0].gateway_refund_id || summary.pendingRefunds[0].id}`);
    return;
  }

  // Authoritative gateway refund
  const refundAmount = Number(booking.total_price);
  console.log(`Initiating Authoritative Gateway Refund of ₹${refundAmount}...`);

  const refundResult = await processBookingRefund(supabase, {
    booking,
    payment,
    refundAmount,
    reason: 'Authoritative recovery refund for cancelled booking',
    actorRole: 'admin',
    actorId: 'admin_manual_recovery'
  });

  console.log(`Refund Execution Result:`, JSON.stringify(refundResult, null, 2));

  if (refundResult.success) {
    console.log(`\n✓ SUCCESS: Refund ${refundResult.gatewayRefundId || 'initiated'} processed successfully!`);
    await supabase
      .from('bookings')
      .update({
        payment_status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id);
  } else {
    console.error(`\n✗ FAILED: ${refundResult.error || refundResult.message}`);
  }
}

const action = process.argv[2];
const param = process.argv[3];

if (action === 'inspect') {
  inspect(param || '2303a52055@sru.edu.in');
} else if (action === 'recover') {
  recover(param);
} else {
  console.log(`
Usage:
  node scripts/investigate_and_recover_refund.js inspect <email_or_booking_code>
  node scripts/investigate_and_recover_refund.js recover <booking_code_or_uuid>
  `);
}
