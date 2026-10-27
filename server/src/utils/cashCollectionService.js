/**
 * server/src/utils/cashCollectionService.js
 *
 * Dedicated Cash Collection Ledger & Offline Financial Management Service
 *
 * Responsibilities:
 * - Authoritative lifecycle for offline cash transactions.
 * - Enforces zero contact with Razorpay for cash bookings.
 * - Idempotent cash collection confirmations by authorized assistants or admins.
 * - Audited dispute logging and cash reimbursement workflows.
 * - Resilient fallback to booking services metadata if cash_collections table is pending migration.
 */

const { formatRazorpayAmount } = require('../config/razorpay');
const defaultDb = require('../config/db');

/**
 * Initializes a cash collection ledger entry for an offline booking.
 *
 * @param {object} supabase
 * @param {object} params
 * @param {object} params.booking
 * @param {string} [params.actorId]
 * @returns {Promise<{ success: boolean, collection?: object, error?: string }>}
 */
async function initializeCashCollection(supabaseClient, optionsOrBooking, maybeActorId = null) {
  const supabase = supabaseClient || defaultDb;
  let booking = null;
  let actorId = null;

  if (optionsOrBooking?.booking) {
    booking = optionsOrBooking.booking;
    actorId = optionsOrBooking.actorId || maybeActorId;
  } else if (optionsOrBooking?.bookingId) {
    booking = {
      id: optionsOrBooking.bookingId,
      booking_id: optionsOrBooking.booking_id || optionsOrBooking.bookingId,
      total_price: optionsOrBooking.expectedAmount || optionsOrBooking.total_price || 0,
      passenger_id: optionsOrBooking.passengerId,
      assistant_id: optionsOrBooking.assistantId
    };
    actorId = optionsOrBooking.actorId || maybeActorId;
  } else if (optionsOrBooking?.id) {
    booking = optionsOrBooking;
    actorId = maybeActorId;
  }

  if (!booking || !booking.id) {
    return { success: false, error: 'Valid booking required to initialize cash collection.' };
  }

  const expectedAmount = Number(booking.total_price || 0);
  const expectedPaise = formatRazorpayAmount(expectedAmount);
  const nowIso = new Date().toISOString();

  const recordPayload = {
    booking_id: booking.id,
    passenger_id: booking.passenger_id || actorId,
    assistant_id: booking.assistant_id || null,
    expected_amount: expectedAmount,
    expected_amount_paise: expectedPaise,
    collected_amount: 0.00,
    collected_amount_paise: 0,
    status: 'awaiting_collection',
    reimbursement_status: 'not_applicable',
    metadata: {
      initialized_by: actorId,
      booking_number: booking.booking_id,
      payment_method: 'cash'
    },
    created_at: nowIso,
    updated_at: nowIso
  };

  let collectionRecord = null;
  try {
    const { data, error } = await supabase
      .from('cash_collections')
      .upsert([recordPayload], { onConflict: 'booking_id' })
      .select()
      .maybeSingle();

    if (!error && data) {
      collectionRecord = data;
    }
  } catch (dbErr) {
    // If table not migrated yet, continue gracefully
  }

  // Update booking canonical collection_status and services metadata
  try {
    const updatedServices = {
      ...(booking.services && typeof booking.services === 'object' ? booking.services : {}),
      cash_collection: {
        expected_amount: expectedAmount,
        collected_amount: 0.00,
        status: 'awaiting_collection',
        reimbursement_status: 'not_applicable',
        initialized_at: nowIso
      }
    };

    await supabase
      .from('bookings')
      .update({
        collection_status: 'awaiting_collection',
        services: updatedServices,
        updated_at: nowIso
      })
      .eq('id', booking.id);
  } catch (bErr) {
    console.warn('Booking collection_status update notice:', bErr.message);
  }

  return {
    success: true,
    collection: collectionRecord || recordPayload
  };
}

/**
 * Authoritatively confirms receipt of physical cash by the assigned assistant or admin.
 */
async function confirmCashCollection(supabaseClient, arg1, arg2) {
  const supabase = supabaseClient || defaultDb;
  let bookingId, actorId, actorRole, amountCollected, notes;
  if (typeof arg1 === 'string') {
    bookingId = arg1;
    const opts = arg2 || {};
    actorId = opts.actorId || opts.confirmedByUserId || 'admin';
    actorRole = opts.actorRole || opts.confirmedByRole || 'admin';
    amountCollected = opts.amountCollected !== undefined ? opts.amountCollected : opts.amount;
    notes = opts.notes || '';
  } else {
    const opts = arg1 || {};
    bookingId = opts.bookingId;
    actorId = opts.actorId || opts.confirmedByUserId || 'admin';
    actorRole = opts.actorRole || opts.confirmedByRole || 'admin';
    amountCollected = opts.amountCollected !== undefined ? opts.amountCollected : opts.amount;
    notes = opts.notes || '';
  }

  if (!bookingId || !actorId) {
    return { success: false, error: 'bookingId and actorId are required.' };
  }

  // 1. Fetch booking with passenger & assistant relations
  const { data: booking, error: bFetchErr } = await supabase
    .from('bookings')
    .select('*, passenger:passenger_id(id, name, email, phone)')
    .eq('id', bookingId)
    .single();

  if (bFetchErr || !booking) {
    return { success: false, error: 'Booking not found.' };
  }

  // 2. Strict authorization: Must be the assigned assistant or an admin
  if (!['admin', 'assistant'].includes(actorRole)) {
    return { success: false, error: `Unauthorized actor role '${actorRole}'. Only sahayak or admin may confirm cash.` };
  }

  if (actorRole !== 'admin' && booking.assistant_id && booking.assistant_id !== actorId) {
    return { success: false, error: 'Forbidden: You are not the assigned Sahayak for this booking.' };
  }

  // 3. Must be a cash booking
  const method = String(booking.payment_method || '').toLowerCase().trim();
  if (!['cash', 'cod', 'pay_on_arrival'].includes(method)) {
    return { success: false, error: 'Cannot record cash collection for an online payment booking.' };
  }

  // 4. In-service check for assistant
  if (actorRole === 'assistant' && booking.booking_status !== 'in_service') {
    return {
      success: false,
      error: `Cash can only be confirmed once service has started (in_service). Current status: ${booking.booking_status}`
    };
  }

  // 5. Idempotency: Reject duplicate collection confirmation
  if (booking.collection_status === 'collected' && booking.payment_status === 'paid') {
    return {
      success: true,
      idempotent: true,
      message: 'Cash payment has already been collected and confirmed.',
      booking
    };
  }

  const finalAmount = amountCollected != null ? Number(amountCollected) : Number(booking.total_price || 0);
  const amountPaise = formatRazorpayAmount(finalAmount);
  const nowIso = new Date().toISOString();

  // 6. Update or insert cash_collections ledger entry
  let collectionRecord = null;
  try {
    const { data: cData, error: cErr } = await supabase
      .from('cash_collections')
      .upsert([{
        booking_id: booking.id,
        passenger_id: booking.passenger_id,
        assistant_id: booking.assistant_id || (actorRole === 'assistant' ? actorId : null),
        expected_amount: Number(booking.total_price || 0),
        expected_amount_paise: formatRazorpayAmount(Number(booking.total_price || 0)),
        collected_amount: finalAmount,
        collected_amount_paise: amountPaise,
        status: 'collected',
        collected_at: nowIso,
        confirmed_by: actorId,
        confirming_actor_role: actorRole,
        metadata: {
          notes,
          confirmed_at: nowIso,
          confirmed_by_id: actorId,
          confirmed_by_role: actorRole
        },
        updated_at: nowIso
      }], { onConflict: 'booking_id' })
      .select()
      .maybeSingle();

    if (!cErr && cData) {
      collectionRecord = cData;
    }
  } catch (cInsertErr) {}

  // 7. Update booking atomically
  const updatedServices = {
    ...(booking.services && typeof booking.services === 'object' ? booking.services : {}),
    cash_collection: {
      collected_amount: finalAmount,
      collected_amount_paise: amountPaise,
      status: 'collected',
      collected_at: nowIso,
      confirmed_by: actorId,
      confirming_actor_role: actorRole,
      notes
    }
  };

  const { data: updatedBooking, error: bUpdateErr } = await supabase
    .from('bookings')
    .update({
      collection_status: 'collected',
      payment_status: 'paid', // Cash marked paid locally, zero Razorpay interaction
      cash_collected_at: nowIso,
      cash_confirmed_by: actorId,
      services: updatedServices,
      updated_at: nowIso
    })
    .eq('id', booking.id)
    .select('*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)')
    .single();

  if (bUpdateErr) {
    return { success: false, error: bUpdateErr.message };
  }

  // 8. Financial audit log
  try {
    await supabase.from('financial_audit_logs').insert([{
      action: 'cash_collection_confirmed',
      entity_type: 'cash_collection',
      entity_id: collectionRecord?.id || booking.id,
      booking_id: booking.id,
      actor_id: actorId,
      actor_role: actorRole,
      amount: finalAmount,
      currency: 'INR',
      metadata: {
        booking_number: booking.booking_id,
        passenger_id: booking.passenger_id,
        assistant_id: booking.assistant_id,
        confirmed_amount: finalAmount,
        actor_role: actorRole
      },
      created_at: nowIso
    }]);
  } catch (auditErr) {}

  return {
    success: true,
    idempotent: false,
    collection: collectionRecord,
    booking: updatedBooking,
    message: `Cash collection of ₹${finalAmount} confirmed successfully.`
  };
}

/**
 * Records a dispute on a cash collection.
 *
 * @param {object} supabase
 * @param {object} params
 * @param {string} params.bookingId
 * @param {string} params.actorId
 * @param {string} params.actorRole
 * @param {string} params.reason
 * @returns {Promise<{ success: boolean, collection?: object, error?: string }>}
 */
async function disputeCashCollection(supabaseClient, {
  bookingId,
  actorId,
  actorRole = 'assistant',
  reason
}) {
  const supabase = supabaseClient || defaultDb;
  if (!bookingId || !reason) {
    return { success: false, error: 'bookingId and dispute reason are required.' };
  }

  const nowIso = new Date().toISOString();

  try {
    await supabase
      .from('cash_collections')
      .update({
        status: 'disputed',
        dispute_reason: String(reason).slice(0, 500),
        updated_at: nowIso
      })
      .eq('booking_id', bookingId);
  } catch (err) {}

  try {
    await supabase
      .from('bookings')
      .update({
        collection_status: 'disputed',
        updated_at: nowIso
      })
      .eq('id', bookingId);
  } catch (bErr) {}

  try {
    await supabase.from('financial_audit_logs').insert([{
      action: 'cash_collection_disputed',
      entity_type: 'cash_collection',
      booking_id: bookingId,
      actor_id: actorId,
      actor_role: actorRole,
      metadata: { reason },
      created_at: nowIso
    }]);
  } catch (aErr) {}

  return { success: true, message: 'Cash collection dispute recorded.' };
}

/**
 * Handles offline cash reimbursement requests for cancelled bookings where cash was collected.
 * Never touches Razorpay.
 *
 * @param {object} supabase
 * @param {object} params
 * @param {string} params.bookingId
 * @param {number} params.reimbursementAmount
 * @param {string} params.reason
 * @param {string} params.actorId
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function recordCashReimbursementRequest(supabaseClient, arg1, arg2) {
  const supabase = supabaseClient || defaultDb;
  let bookingId, reimbursementAmount, reason, actorId;
  if (typeof arg1 === 'string') {
    bookingId = arg1;
    const opts = arg2 || {};
    reimbursementAmount = opts.reimbursementAmount !== undefined ? opts.reimbursementAmount : opts.amount;
    reason = opts.reason || 'Cancelled after cash collection';
    actorId = opts.actorId || 'admin';
  } else {
    const opts = arg1 || {};
    bookingId = opts.bookingId;
    reimbursementAmount = opts.reimbursementAmount !== undefined ? opts.reimbursementAmount : opts.amount;
    reason = opts.reason || 'Cancelled after cash collection';
    actorId = opts.actorId || 'admin';
  }

  const nowIso = new Date().toISOString();
  const amountPaise = formatRazorpayAmount(reimbursementAmount);

  let collectionRecord = null;
  try {
    const { data } = await supabase
      .from('cash_collections')
      .update({
        status: 'reimbursement_requested',
        reimbursement_status: 'pending',
        reimbursement_amount: Number(reimbursementAmount),
        reimbursement_amount_paise: amountPaise,
        reimbursement_notes: reason,
        updated_at: nowIso
      })
      .eq('booking_id', bookingId)
      .select()
      .maybeSingle();
    collectionRecord = data;
  } catch (err) {}

  try {
    await supabase.from('financial_audit_logs').insert([{
      action: 'cash_reimbursement_requested',
      entity_type: 'cash_collection',
      booking_id: bookingId,
      actor_id: actorId,
      amount: reimbursementAmount,
      currency: 'INR',
      metadata: { reason, reimbursement_status: 'pending' },
      created_at: nowIso
    }]);
  } catch (auditErr) {}

  return {
    success: true,
    collection: collectionRecord || { booking_id: bookingId, status: 'reimbursement_requested', reimbursement_amount: reimbursementAmount },
    message: `Offline cash reimbursement of ₹${reimbursementAmount} recorded as pending admin disbursement.`
  };
}

/**
 * Confirms that cash reimbursement has been paid to the passenger by an authorized admin.
 *
 * @param {object} supabase
 * @param {object|string} arg1
 * @param {object} [arg2]
 * @returns {Promise<{ success: boolean, collection?: object, message: string }>}
 */
async function confirmCashReimbursement(supabaseClient, arg1, arg2) {
  const supabase = supabaseClient || defaultDb;
  let bookingId, amount, notes, adminId;
  if (typeof arg1 === 'string') {
    bookingId = arg1;
    const opts = arg2 || {};
    amount = opts.amount;
    notes = opts.notes || '';
    adminId = opts.adminId || opts.reimbursedByUserId || 'admin';
  } else {
    const opts = arg1 || {};
    bookingId = opts.bookingId;
    amount = opts.amount;
    notes = opts.notes || '';
    adminId = opts.adminId || opts.reimbursedByUserId || 'admin';
  }

  const nowIso = new Date().toISOString();
  let collectionRecord = null;

  try {
    const { data } = await supabase
      .from('cash_collections')
      .update({
        status: 'reversed',
        reimbursement_status: 'reimbursed',
        reimbursed_at: nowIso,
        reimbursed_by: adminId,
        metadata: { reimbursement_notes: notes, reimbursed_at: nowIso },
        updated_at: nowIso
      })
      .eq('booking_id', bookingId)
      .select()
      .maybeSingle();
    collectionRecord = data;
  } catch (err) {}

  try {
    await supabase
      .from('bookings')
      .update({
        collection_status: 'reversed',
        updated_at: nowIso
      })
      .eq('id', bookingId);
  } catch (bErr) {}

  try {
    await supabase.from('financial_audit_logs').insert([{
      action: 'cash_reimbursement_confirmed',
      entity_type: 'cash_collection',
      booking_id: bookingId,
      actor_id: adminId,
      actor_role: 'admin',
      amount,
      currency: 'INR',
      metadata: { notes, reimbursement_status: 'reimbursed' },
      created_at: nowIso
    }]);
  } catch (auditErr) {}

  return {
    success: true,
    collection: collectionRecord || { booking_id: bookingId, status: 'reversed', reimbursement_status: 'reimbursed' },
    message: `Physical cash reimbursement confirmed by admin ${adminId}.`
  };
}

module.exports = {
  initializeCashCollection,
  confirmCashCollection,
  disputeCashCollection,
  recordCashReimbursementRequest,
  confirmCashReimbursement
};
