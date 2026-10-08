const supabase = require('../config/db');
const { formatBooking } = require('../utils/bookingFormatter');
const { broadcast, getIO } = require('./serviceController');
const { calculateBookingPrice } = require('../config/pricing');
const bookingResolver = require('../utils/bookingResolver');
const resolveBooking = (...args) => bookingResolver.resolveBooking(...args);
const {
  isValidPaymentMethod,
  isCashPayment,
  isOnlinePayment,
  normalizePaymentMethod
} = require('../utils/paymentClassification');
const {
  createBookingRecordInDB,
  buildServiceData,
  buildServiceDescription,
  generateBookingId
} = require('../utils/bookingCore');
const {
  validateTrainStations,
  isAssistantAcceptedBooking,
  canModifyBookingDetails
} = require('../services/trainRouteService');
const { createNotification } = require('../services/notificationService');

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const ACTIVE_BOOKING_STATUSES = [
  'pending',
  'accepted',
  'arriving',
  'in_service'
];


/*
|--------------------------------------------------------------------------
| CREATE BOOKING
|--------------------------------------------------------------------------
|
| POST /api/bookings
|
|--------------------------------------------------------------------------
*/

exports.createBooking = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('id', req.user.id)
      .maybeSingle();

    if (!userExists) {
      return res.status(401).json({
        message: 'Your session has expired. Please log out and log in again to sync your account.'
      });
    }

    const { booking, normalizedPaymentMethod } = await createBookingRecordInDB(
      supabase,
      req.user.id,
      req.body
    );

    const formatted = formatBooking(booking, { includeOTP: true });

    // Realtime notification based on Option C rules:
    // Cash: immediately broadcast new_booking to fleet and status_update
    // Online: DO NOT broadcast new_booking until payment is completed and verified in Phase 2
    try {
      const io = getIO();
      if (io) {
        if (isCashPayment(normalizedPaymentMethod)) {
          // Send sanitized booking without OTP to station assistants / admin room
          const fleetFormatted = formatBooking(booking, { includeOTP: false });
          io.to('admin_room').emit('new_booking', fleetFormatted);
          if (booking.station_code) {
            io.to(`station_${booking.station_code}`).emit('new_booking', fleetFormatted);
          }
          // Only send full booking with OTP to passenger's authorized rooms
          io.to(`passenger_${booking.passenger_id}`).emit('new_booking', formatted);
          io.to(`booking_${booking.id}`).emit('status_update', formatted);
          io.to(`passenger_${booking.passenger_id}`).emit('status_update', formatted);
        } else {
          // Unpaid online booking: only notify passenger's private room
          io.to(`booking_${booking.id}`).emit('status_update', formatted);
          io.to(`passenger_${booking.passenger_id}`).emit('status_update', formatted);
        }
      }
    } catch (e) {
      console.warn('Socket broadcast warning:', e.message);
    }

    return res.status(201).json(formatted);

  } catch (error) {
    if (error.status && error.message) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('CREATE BOOKING SERVER ERROR:', error);
    return res.status(500).json({
      message: 'Server error while creating booking.'
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET MY BOOKINGS
|--------------------------------------------------------------------------
|
| GET /api/bookings/my-bookings
|
|--------------------------------------------------------------------------
*/

exports.getMyBookings = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Get passenger bookings
    |--------------------------------------------------------------------------
    */

    const {
      data: bookings,
      error
    } = await supabase
      .from('bookings')
      .select('*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)')
      .eq(
        'passenger_id',
        req.user.id
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      )
      .order(
        'id',
        {
          ascending: false
        }
      );


    if (error) {
      console.error(
        'GET MY BOOKINGS ERROR:',
        error
      );

      return res.status(400).json({
        message: error.message
      });
    }


    /*
    |--------------------------------------------------------------------------
    | Format and return — include OTP for passenger's own bookings
    |--------------------------------------------------------------------------
    */

    const result = (bookings || []).map((b) =>
      formatBooking(b, { includeOTP: true })
    );

    const isOngoingStatus = (status, journeyDate) => {
      const s = (status || '').toLowerCase();
      if (s === 'completed' || s === 'cancelled') return false;
      if (['in_service', 'reached', 'arriving', 'accepted', 'assigned'].includes(s)) return true;
      if (['pending', 'confirmed'].includes(s)) {
        const today = new Date().toISOString().slice(0, 10);
        const jDate = (journeyDate || '').slice(0, 10);
        if (jDate && jDate === today) return true;
      }
      return false;
    };

    const total = result.length;
    let ongoing = 0;
    let upcoming = 0;
    let completed = 0;

    for (const b of result) {
      const s = (b.booking_status || b.status || '').toLowerCase();
      if (s === 'completed') {
        completed++;
      } else if (isOngoingStatus(s, b.journey_date)) {
        ongoing++;
      } else if (s !== 'cancelled') {
        upcoming++;
      }
    }

    if (req.query.format === 'array') {
      return res.json(result);
    }

    return res.json({
      success: true,
      trips: result,
      counts: {
        total,
        ongoing,
        upcoming,
        completed
      }
    });

  } catch (error) {
    console.error(
      'GET MY BOOKINGS SERVER ERROR:',
      error
    );

    return res.status(500).json({
      message: 'Unable to load bookings.'
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET SINGLE BOOKING
|--------------------------------------------------------------------------
|
| GET /api/bookings/:id
|
|--------------------------------------------------------------------------
*/

exports.getBookingById = async (req, res) => {
  try {

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }


    const { booking, error } = await resolveBooking(
      supabase,
      req.params.id,
      '*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)'
    );

    if (error) {
      console.error('GET BOOKING ERROR:', error);
      return res.status(400).json({ message: error.message });
    }

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }


    /*
    |--------------------------------------------------------------------------
    | Authorization
    |--------------------------------------------------------------------------
    |
    | Passenger can see own booking (incl. OTP).
    | Assigned assistant can see the booking (excl. OTP).
    | Admin can see everything (incl. OTP).
    |--------------------------------------------------------------------------
    */

    const isPassenger =
      booking.passenger_id ===
      req.user.id;

    const isAssistant =
      booking.assistant_id ===
      req.user.id;

    const isAdmin =
      req.user.role === 'admin';


    if (
      !isPassenger &&
      !isAssistant &&
      !isAdmin
    ) {
      return res.status(403).json({
        message: 'You are not authorized to view this booking.'
      });
    }


    if (booking.assistant && booking.assistant_id) {
      try {
        const { data: assistantJobs } = await supabase
          .from('bookings')
          .select('rating, booking_status')
          .eq('assistant_id', booking.assistant_id);

        if (assistantJobs) {
          const completed = assistantJobs.filter((j) => j.booking_status === 'completed');
          const rated = completed.filter((j) => j.rating);
          const avg = rated.length
            ? (rated.reduce((s, j) => s + Number(j.rating), 0) / rated.length).toFixed(1)
            : null;
          booking.assistant.completed_jobs = completed.length;
          booking.assistant.rating = avg;
        }
      } catch (err) {
        // Non-blocking assistant stats
      }
    }

    try {
      const { data: protRecord } = await supabase
        .from('journey_protection')
        .select('*')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (protRecord) {
        booking.journey_protection = protRecord;
      }
    } catch (pErr) {
      // Non-blocking protection lookup
    }

    const includeOTP = isPassenger || isAdmin;

    return res.json(formatBooking(booking, { includeOTP }));

  } catch (error) {
    console.error(
      'GET BOOKING SERVER ERROR:',
      error
    );

    return res.status(500).json({
      message: 'Unable to load booking.'
    });
  }
};


/*
|--------------------------------------------------------------------------
| CANCEL BOOKING BY PASSENGER (Phase 3A Rules & Refund Engine)
|--------------------------------------------------------------------------
|
| POST /api/bookings/:id/cancel
|
|--------------------------------------------------------------------------
*/

const {
  canPassengerCancel,
  calculateCancellationRefund,
  validateCancellationReason,
  UNASSIGNED_REASONS,
  ASSIGNED_REASONS,
  UNASSIGNED_REFUND_PERCENTAGE,
  ASSIGNED_ASSISTANT_VALID_REASON_REFUND_PERCENTAGE,
  ASSIGNED_ASSISTANT_VOLUNTARY_REFUND_PERCENTAGE,
  VOLUNTARY_CANCELLATION_CHARGE_PERCENTAGE
} = require('../utils/cancellationRules');
const { processBookingRefund } = require('../utils/refundService');
const { reverseAssistantEarning } = require('../utils/earningsService');

/*
|--------------------------------------------------------------------------
| GET CANCELLATION POLICY
|--------------------------------------------------------------------------
|
| GET /api/bookings/cancellation-policy
|
|--------------------------------------------------------------------------
*/
exports.getCancellationPolicy = async (req, res) => {
  try {
    return res.json({
      success: true,
      policy: {
        unassignedRefundPercent: UNASSIGNED_REFUND_PERCENTAGE,
        assignedEligibleRefundPercent: ASSIGNED_ASSISTANT_VALID_REASON_REFUND_PERCENTAGE,
        assignedVoluntaryRefundPercent: ASSIGNED_ASSISTANT_VOLUNTARY_REFUND_PERCENTAGE,
        voluntaryCancellationChargePercent: VOLUNTARY_CANCELLATION_CHARGE_PERCENTAGE,
        unassignedReasons: UNASSIGNED_REASONS,
        assignedReasons: ASSIGNED_REASONS,
        rules: [
          'Before assistant assignment: 100% refund for all eligible cancellation reasons.',
          'After assistant assignment: You may choose to Change/Rebook your booking without cancellation.',
          'Cancellation after assignment with valid travel disruption reasons receives 100% refund.',
          'Voluntary cancellation after assignment applies a 30% cancellation charge (70% refund).',
          'Service in progress (In-Service): Cancellations are strictly not permitted once assistance has started.',
          'Completed bookings cannot be cancelled.',
          'Cash (COD) bookings: 0 online gateway deduction. Any charges are reconciled in your account summary.',
          'Online payments: Refunds are automatically routed through the payment gateway (Razorpay/Cashfree).'
        ]
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to load cancellation policy.' });
  }
};

/*
|--------------------------------------------------------------------------
| GET CANCELLATION QUOTE / PREVIEW
|--------------------------------------------------------------------------
|
| POST /api/bookings/:id/cancel-quote
|
|--------------------------------------------------------------------------
*/
exports.getCancelQuote = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { booking, error: findError } = await resolveBooking(supabase, req.params.id);
    if (findError || !booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.passenger_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to access this booking.' });
    }

    let paymentRecord = null;
    try {
      const { data: pData } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false })
        .maybeSingle();
      paymentRecord = pData;
    } catch (pErr) {}

    const ruleCheck = canPassengerCancel(booking, paymentRecord);
    if (!ruleCheck.allowed) {
      return res.status(400).json({
        success: false,
        message: ruleCheck.reason || 'This booking cannot be cancelled in its current status.'
      });
    }

    const isAssigned = Boolean(
      booking.assistant_id &&
      ['accepted', 'arriving'].includes(String(booking.booking_status || '').toLowerCase())
    );

    const reasonCategory = req.body?.reasonCategory || req.query?.reasonCategory || (isAssigned ? 'VOLUNTARY_CANCEL' : 'CHANGE_OF_PLANS');
    const reasonDetails = req.body?.reasonDetails || req.query?.reasonDetails || '';

    const quote = calculateCancellationRefund(booking, paymentRecord, reasonCategory, reasonDetails);

    return res.json({
      success: true,
      quote
    });
  } catch (error) {
    console.error('CANCEL QUOTE ERROR:', error);
    return res.status(500).json({ success: false, message: 'Unable to calculate cancellation quote.' });
  }
};

/*
|--------------------------------------------------------------------------
| CANCEL BOOKING BY PASSENGER
|--------------------------------------------------------------------------
|
| POST /api/bookings/:id/cancel
|
|--------------------------------------------------------------------------
*/
exports.cancelBooking = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    // 1. Resolve booking
    const { booking, error: findError } = await resolveBooking(supabase, req.params.id);

    if (findError || !booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    // 2. Ownership verification
    if (booking.passenger_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'You are not authorized to cancel this booking.'
      });
    }

    // 3. Authoritative payment ledger row
    let paymentRecord = null;
    try {
      const { data: pData } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false })
        .maybeSingle();
      paymentRecord = pData;
    } catch (pErr) {}

    // 4. Centralized Status Rule Check
    const ruleCheck = canPassengerCancel(booking, paymentRecord);
    if (!ruleCheck.allowed) {
      if (ruleCheck.isAlreadyCancelled) {
        const formatted = formatBooking(booking, { includeOTP: false });
        return res.json({
          success: true,
          idempotent: true,
          message: 'Booking is already cancelled.',
          booking: formatted,
          ...formatted
        });
      }
      return res.status(400).json({
        success: false,
        message: ruleCheck.reason || 'This booking cannot be cancelled.'
      });
    }

    const isAssigned = Boolean(
      booking.assistant_id &&
      ['accepted', 'arriving'].includes(String(booking.booking_status || '').toLowerCase())
    );

    // 5. Reason Validation
    const reasonCategory = req.body?.reasonCategory || req.body?.reason_category || req.body?.reason || (isAssigned ? 'VOLUNTARY_CANCEL' : 'CHANGE_OF_PLANS');
    const reasonDetails = req.body?.reasonDetails || req.body?.reason_details || '';

    const reasonValidation = validateCancellationReason(reasonCategory, reasonDetails, isAssigned);
    if (!reasonValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: reasonValidation.message
      });
    }

    // 6. Calculate Authoritative Refund Breakdown
    const calc = calculateCancellationRefund(booking, paymentRecord, reasonCategory, reasonDetails);

    // 7. Execute Refund (if eligible online payment)
    let refundResult = null;
    if (calc.requiresGatewayRefund && paymentRecord) {
      refundResult = await processBookingRefund(supabase, {
        booking,
        payment: paymentRecord,
        refundAmount: calc.refundAmount,
        reason: reasonDetails ? `${reasonCategory}: ${reasonDetails}` : reasonCategory,
        actorRole: 'passenger',
        actorId: req.user.id
      });
    }

    // 8. Update booking status & services metadata
    const nowIso = new Date().toISOString();
    const isCash = isCashPayment(booking.payment_method);
    const newPaymentStatus = refundResult?.success
      ? 'refunded'
      : (isCash || paymentRecord?.status === 'pending')
        ? 'cancelled'
        : booking.payment_status;

    const cancellationMetadata = {
      reason_category: reasonCategory,
      reason_details: reasonDetails || '',
      refund_percentage: calc.refundPercent,
      refund_amount: calc.refundAmount,
      cancellation_charge: calc.cancellationCharge,
      cancelled_by: req.user.id,
      cancelled_at: nowIso,
      refund_status: refundResult?.success
        ? 'processed'
        : (calc.requiresGatewayRefund ? 'failed' : (isCash ? 'cod_reconciled' : 'cancelled')),
      payment_method: booking.payment_method
    };

    const updatedServices = {
      ...(booking.services && typeof booking.services === 'object' ? booking.services : {}),
      cancellation: cancellationMetadata
    };

    const updatePayload = {
      booking_status: 'cancelled',
      payment_status: newPaymentStatus,
      services: updatedServices,
      updated_at: nowIso
    };

    let { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', booking.id)
      .select('*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)')
      .single();

    if (updateError && updateError.message?.includes('bookings_payment_status_check')) {
      const fallbackStatus = refundResult?.success ? 'refunded' : (booking.payment_status === 'paid' ? 'refunded' : 'failed');
      const retryResult = await supabase
        .from('bookings')
        .update({
          ...updatePayload,
          payment_status: fallbackStatus
        })
        .eq('id', booking.id)
        .select('*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)')
        .single();

      updatedBooking = retryResult.data;
      updateError = retryResult.error;
    }

    if (updateError) {
      console.error('CANCEL BOOKING UPDATE ERROR:', updateError);
      return res.status(400).json({ message: updateError.message });
    }

    // 9. Update pending payment ledger to cancelled if not charged
    if (paymentRecord?.id && paymentRecord.status === 'pending') {
      try {
        await supabase
          .from('payments')
          .update({
            status: 'cancelled',
            updated_at: nowIso
          })
          .eq('id', paymentRecord.id);
      } catch (payCancelErr) {}
    }

    // 9b. Update Journey Protection status to cancelled if present
    try {
      await supabase
        .from('journey_protection')
        .update({
          status: 'cancelled',
          updated_at: nowIso
        })
        .eq('booking_id', booking.id)
        .in('status', ['pending_payment', 'active']);
    } catch (protCancelErr) {
      console.warn('Journey protection cancellation notice:', protCancelErr.message);
    }

    // 10. Reverse any pending assistant earnings & release assistant
    if (booking.assistant_id) {
      await reverseAssistantEarning(supabase, booking.id, 'Passenger cancelled booking');
      try {
        const io = getIO();
        if (io) {
          io.to(`user_${booking.assistant_id}`).emit('job_cancelled', {
            booking_id: booking.id,
            booking_code: booking.booking_id,
            message: 'Passenger has cancelled this assistance booking. Job released back to platform.'
          });
        }
      } catch (e) {}
    }

    // 11. Insert Audit Log
    try {
      await supabase.from('cancellation_logs').insert({
        booking_id: booking.id,
        passenger_id: req.user.id,
        assistant_id: booking.assistant_id || null,
        previous_status: booking.booking_status,
        new_status: 'cancelled',
        reason_category: reasonCategory,
        reason_details: reasonDetails || '',
        refund_percentage: calc.refundPercent,
        refund_amount: calc.refundAmount,
        cancellation_charge: calc.cancellationCharge,
        payment_method: booking.payment_method,
        actor_id: req.user.id,
        actor_role: 'passenger'
      });
    } catch (logErr) {
      // Non-blocking log insertion
    }

    // 12. Realtime Socket.IO Broadcast
    const formatted = formatBooking(updatedBooking, { includeOTP: false });
    try {
      const io = getIO();
      if (io) {
        io.to(`booking_${booking.id}`).emit('booking_cancelled', formatted);
        io.to(`booking_${booking.id}`).emit('status_update', formatted);
        io.to(`passenger_${booking.passenger_id}`).emit('booking_cancelled', formatted);
        io.to(`passenger_${booking.passenger_id}`).emit('status_update', formatted);
        if (booking.assistant_id) {
          io.to(`assistant_${booking.assistant_id}`).emit('booking_cancelled', formatted);
          io.to(`assistant_${booking.assistant_id}`).emit('status_update', formatted);
        }
        io.to('admin_room').emit('booking_cancelled', formatted);
        io.to('admin_room').emit('status_update', formatted);
      }
    } catch (socketErr) {
      console.warn('Socket broadcast warning:', socketErr.message);
    }

    let confirmationMsg = 'Booking cancelled successfully.';
    if (refundResult?.success) {
      confirmationMsg = `Booking cancelled successfully. Refund of ₹${calc.refundAmount} has been processed.`;
    } else if (calc.cancellationCharge > 0) {
      confirmationMsg = `Booking cancelled. A cancellation charge of ₹${calc.cancellationCharge} (30%) applies. Refund: ₹${calc.refundAmount}.`;
    }

    return res.json({
      success: true,
      idempotent: false,
      message: confirmationMsg,
      booking: formatted,
      refund: refundResult?.refund || null,
      quote: calc,
      ...formatted
    });

  } catch (error) {
    console.error('CANCEL BOOKING SERVER ERROR:', error);
    return res.status(500).json({
      message: 'Unable to cancel booking.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| REBOOK / MODIFY BOOKING QUOTE
|--------------------------------------------------------------------------
|
| POST /api/bookings/:id/rebook-quote
|
|--------------------------------------------------------------------------
*/
exports.rebookQuote = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { booking, error } = await resolveBooking(supabase, req.params.id);
    if (error || !booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.passenger_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to access this booking.' });
    }

    const status = String(booking.booking_status || '').toLowerCase();
    if (['in_service', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Bookings in '${status}' status cannot be modified.`
      });
    }

    const { services, station_code, journey_date } = req.body;
    let newTotal = Number(booking.total_price);

    const isAccepted = isAssistantAcceptedBooking(booking);
    if (isAccepted && station_code && station_code.trim().toUpperCase() !== String(booking.station_code || '').trim().toUpperCase()) {
      return res.status(400).json({
        success: false,
        message: 'Station and train details cannot be changed after an assistant has accepted this booking.'
      });
    }

    if (services && typeof services === 'object') {
      try {
        const pricingResult = calculateBookingPrice(services);
        newTotal = pricingResult.total;
      } catch (priceErr) {
        // Keep current price
      }
    }

    const priceDifference = Math.round((newTotal - Number(booking.total_price)) * 100) / 100;

    let assistantReassignmentRequired = false;
    if (booking.assistant_id) {
      const stationChanged = station_code && station_code !== booking.station_code;
      const dateChanged = journey_date && journey_date !== booking.journey_date;
      if (stationChanged || dateChanged) {
        assistantReassignmentRequired = true;
      }
    }

    return res.json({
      success: true,
      currentTotal: Number(booking.total_price),
      newTotal,
      priceDifference,
      assistantReassignmentRequired
    });
  } catch (err) {
    console.error('REBOOK QUOTE ERROR:', err);
    return res.status(500).json({ success: false, message: 'Unable to calculate rebooking quote.' });
  }
};

/*
|--------------------------------------------------------------------------
| REBOOK / MODIFY BOOKING
|--------------------------------------------------------------------------
|
| POST /api/bookings/:id/rebook
|
|--------------------------------------------------------------------------
*/
exports.rebookBooking = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { booking, error: findError } = await resolveBooking(supabase, req.params.id);
    if (findError || !booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.passenger_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to update this booking.' });
    }

    const currentStatus = String(booking.booking_status || '').toLowerCase();
    if (['in_service', 'completed', 'cancelled'].includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Bookings in '${currentStatus}' status cannot be modified.`
      });
    }

    const {
      train_number,
      train_no,
      train_name,
      station_code,
      source,
      destination,
      journey_date,
      journey_time,
      coach,
      seat_number,
      berth_type,
      services,
      platform
    } = req.body;

    const previousSnapshot = {
      train_number: booking.train_number,
      train_name: booking.train_name,
      station_code: booking.station_code,
      source: booking.source,
      destination: booking.destination,
      journey_date: booking.journey_date,
      journey_time: booking.journey_time,
      coach: booking.coach || booking.services?.coach,
      seat_number: booking.seat_number || booking.services?.seat_number,
      berth_type: booking.berth_type || booking.services?.berth_type,
      total_price: booking.total_price,
      assistant_id: booking.assistant_id,
      rebooked_at: new Date().toISOString()
    };

    const updatePayload = {
      updated_at: new Date().toISOString()
    };

    const isAccepted = isAssistantAcceptedBooking(booking);

    if (isAccepted) {
      // Locked station and train details once assistant has accepted
      const stationChanged = station_code && station_code.trim().toUpperCase() !== String(booking.station_code || '').trim().toUpperCase();
      const trainChanged = (train_number || train_no) && (train_number || train_no).trim().toUpperCase() !== String(booking.train_number || booking.train_no || '').trim().toUpperCase();
      const destChanged = destination && destination.trim().toUpperCase() !== String(booking.destination || '').trim().toUpperCase();

      if (stationChanged || destChanged || trainChanged) {
        return res.status(400).json({
          success: false,
          message: 'Station and train details cannot be changed after an assistant has accepted this booking.'
        });
      }
    } else {
      // Before assistant acceptance, validate train & stations
      const targetTrain = (train_number || train_no || booking.train_number || booking.train_no || '').trim();
      const targetBoarding = (station_code || source || booking.station_code || booking.source || '').trim().toUpperCase();
      const targetDestination = (destination || booking.destination || '').trim().toUpperCase();

      if (targetTrain && targetBoarding) {
        const validation = validateTrainStations(targetTrain, targetBoarding, targetDestination);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: validation.error
          });
        }
        if (validation.train?.train_name && !train_name) {
          updatePayload.train_name = validation.train.train_name;
        }
      }
    }

    if (train_number || train_no) updatePayload.train_number = (train_number || train_no).trim();
    if (train_name) updatePayload.train_name = train_name.trim();
    if (station_code) updatePayload.station_code = station_code.trim().toUpperCase();
    if (source) updatePayload.source = source.trim();
    if (destination) updatePayload.destination = destination.trim();
    if (journey_date) updatePayload.journey_date = journey_date.trim();
    if (journey_time) updatePayload.journey_time = journey_time.trim();

    // Recalculate price if services changed
    let newPrice = Number(booking.total_price);
    const existingServices = (booking.services && typeof booking.services === 'object') ? booking.services : {};
    let mergedServices = { ...existingServices };

    if (services && typeof services === 'object') {
      try {
        const pricing = calculateBookingPrice(services);
        newPrice = pricing.total;
        mergedServices = { ...mergedServices, ...services };
      } catch (e) {}
    }

    updatePayload.total_price = newPrice;

    if (coach !== undefined) {
      mergedServices.coach = coach.trim().toUpperCase();
    }
    if (seat_number !== undefined) {
      mergedServices.seat_number = seat_number.trim().toUpperCase();
    }
    if (berth_type !== undefined) {
      mergedServices.berth_type = berth_type;
    }
    if (platform !== undefined) {
      mergedServices.platform = platform;
    }

    updatePayload.services = mergedServices;

    const serviceText = booking.service || (Array.isArray(booking.services) ? booking.services.join(', ') : 'Station Assistance');
    updatePayload.service_description = buildServiceDescription(serviceText, {
      coach: updatePayload.coach || booking.coach || mergedServices.coach,
      seat_number: updatePayload.seat_number || booking.seat_number || mergedServices.seat_number,
      berth_type: updatePayload.berth_type || booking.berth_type || mergedServices.berth_type,
      action_type: mergedServices.action_type || 'load_to_seat',
      journey_time: updatePayload.journey_time || booking.journey_time
    });

    // Evaluate Assistant Compatibility
    let assistantReassigned = false;
    const prevAssistantId = booking.assistant_id;

    if (prevAssistantId && !isAccepted) {
      const stationChanged = station_code && station_code !== booking.station_code;
      const dateChanged = journey_date && journey_date !== booking.journey_date;

      if (stationChanged || dateChanged) {
        assistantReassigned = true;
        updatePayload.assistant_id = null;
        updatePayload.assistant_status = 'pending';
        updatePayload.booking_status = 'pending';
        updatePayload.start_otp = null;
        updatePayload.start_otp_verified = false;
        updatePayload.start_otp_expires_at = null;

        await reverseAssistantEarning(supabase, booking.id, 'Booking modified by passenger - reassignment triggered');

        try {
          const io = getIO();
          if (io) {
            io.to(`user_${prevAssistantId}`).emit('job_reassigned', {
              booking_id: booking.id,
              booking_code: booking.booking_id,
              message: 'Passenger changed journey details. Job released back to dispatch pool.'
            });
          }
        } catch (e) {}
      }
    }

    mergedServices.rebooking = {
      rebooked_at: new Date().toISOString(),
      previous_booking_data: previousSnapshot,
      assistant_reassigned: assistantReassigned
    };

    updatePayload.services = mergedServices;

    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', booking.id)
      .select('*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)')
      .single();

    if (updateError) {
      console.error('REBOOK UPDATE ERROR:', updateError);
      return res.status(400).json({ message: updateError.message });
    }

    const formatted = formatBooking(updated, { includeOTP: true });

    try {
      const io = getIO();
      if (io) {
        io.to(`booking_${booking.id}`).emit('status_update', formatted);
        io.to(`booking_${booking.id}`).emit('booking_updated', formatted);
        io.to(`passenger_${booking.passenger_id}`).emit('status_update', formatted);
        io.to(`passenger_${booking.passenger_id}`).emit('booking_updated', formatted);
        io.to('admin_room').emit('status_update', formatBooking(updated, { includeOTP: false }));
        io.to('admin_room').emit('booking_updated', formatBooking(updated, { includeOTP: false }));

        if (updated.assistant_id) {
          io.to(`user_${updated.assistant_id}`).emit('status_update', formatBooking(updated, { includeOTP: false }));
          io.to(`user_${updated.assistant_id}`).emit('booking_updated', formatBooking(updated, { includeOTP: false }));
          io.to(`assistant_${updated.assistant_id}`).emit('status_update', formatBooking(updated, { includeOTP: false }));
          io.to(`assistant_${updated.assistant_id}`).emit('booking_updated', formatBooking(updated, { includeOTP: false }));
        }
      }
    } catch (e) {}

    // Dispatch real-time user notifications
    if (updated.assistant_id && !assistantReassigned) {
      createNotification({
        userId: updated.assistant_id,
        bookingId: booking.id,
        title: 'Booking Details Updated',
        message: `Passenger updated booking details for train ${updatePayload.train_number || booking.train_number}: Coach ${updatePayload.coach || booking.coach || 'TBD'}, Seat ${updatePayload.seat_number || booking.seat_number || 'TBD'}, Platform ${platform || mergedServices.platform || '1'}.`,
        type: 'info',
        metadata: { booking_id: booking.id, booking_code: booking.booking_id }
      }).catch(() => {});
    }

    createNotification({
      userId: booking.passenger_id,
      bookingId: booking.id,
      title: 'Booking Details Updated',
      message: 'Your booking details were updated successfully.',
      type: 'success',
      metadata: { booking_id: booking.id, booking_code: booking.booking_id }
    }).catch(() => {});

    return res.json({
      success: true,
      message: assistantReassigned
        ? 'Journey updated successfully. Assistant will be reassigned for your revised schedule.'
        : 'Journey updated successfully.',
      booking: formatted,
      assistantReassigned,
      ...formatted
    });
  } catch (error) {
    console.error('REBOOK SERVER ERROR:', error);
    return res.status(500).json({ message: 'Unable to update booking.' });
  }
};


/*
|--------------------------------------------------------------------------
| RATE COMPLETED BOOKING
|--------------------------------------------------------------------------
|
| POST /api/bookings/:id/rating
|
| Body:
|
| {
|   "rating": 5
| }
|
|--------------------------------------------------------------------------
*/

exports.rateBooking = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    const rating = Number(req.body.rating);

    /*
    |--------------------------------------------------------------------------
    | Validate rating
    |--------------------------------------------------------------------------
    */
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: 'Rating must be between 1 and 5.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find booking
    |--------------------------------------------------------------------------
    */
    const { booking, error: findError } = await resolveBooking(
      supabase,
      req.params.id,
      'id, booking_id, passenger_id, assistant_id, booking_status, rating, review'
    );

    if (findError) {
      return res.status(400).json({ message: findError.message });
    }

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    /*
    |--------------------------------------------------------------------------
    | 1. Verify passenger ownership
    |--------------------------------------------------------------------------
    */
    if (String(booking.passenger_id) !== String(req.user.id)) {
      return res.status(403).json({
        message: 'You are not authorized to rate this booking.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 2. Only completed bookings can be rated
    |--------------------------------------------------------------------------
    */
    if (booking.booking_status !== 'completed') {
      return res.status(400).json({
        message: 'Only completed bookings can be rated.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 3. Verify assistant was actually assigned
    |--------------------------------------------------------------------------
    */
    if (!booking.assistant_id) {
      return res.status(400).json({
        message: 'No assistant was assigned to this booking.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 4. Verify submitted assistant ID matches assigned assistant
    |--------------------------------------------------------------------------
    */
    const submittedAssistantId = req.body.assistantId || req.body.assistant_id;
    if (submittedAssistantId && String(submittedAssistantId) !== String(booking.assistant_id)) {
      return res.status(400).json({
        message: 'The assistant being rated does not match the assigned assistant.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | 5. Prevent duplicate feedback
    |--------------------------------------------------------------------------
    */
    if (booking.rating !== null && booking.rating !== undefined) {
      return res.status(409).json({
        message: 'Feedback has already been submitted for this booking.'
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Save rating & review
    |--------------------------------------------------------------------------
    */
    const reviewText = req.body.review !== undefined ? req.body.review : req.body.comment;
    const finalReview = reviewText ? String(reviewText).slice(0, 1000) : null;

    const updatePayload = {
      rating,
      review: finalReview,
      updated_at: new Date().toISOString()
    };

    const {
      data,
      error
    } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', booking.id)
      .select('*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)')
      .single();

    if (error) {
      console.error('RATE BOOKING ERROR:', error);
      return res.status(400).json({
        message: error.message
      });
    }

    // Authoritatively calculate assistant's real rating and stats from database
    let assistantAvgRating = null;
    let assistantTotalRatings = 0;
    try {
      const { data: assistantJobs } = await supabase
        .from('bookings')
        .select('rating, booking_status')
        .eq('assistant_id', booking.assistant_id);

      if (assistantJobs) {
        const completed = assistantJobs.filter((j) => j.booking_status === 'completed');
        const rated = completed.filter((j) => j.rating && Number(j.rating) > 0);
        assistantTotalRatings = rated.length;
        assistantAvgRating = rated.length
          ? (rated.reduce((s, j) => s + Number(j.rating), 0) / rated.length).toFixed(1)
          : null;

        if (data?.assistant) {
          data.assistant.completed_jobs = completed.length;
          data.assistant.rating = assistantAvgRating;
          data.assistant.total_ratings = assistantTotalRatings;
        }
      }
    } catch (err) {
      // Non-blocking assistant stats calculation
    }

    const formatted = formatBooking(data, { includeOTP: true });
    broadcast(booking.id, formatted);
    if (booking.booking_id && booking.booking_id !== booking.id) {
      broadcast(booking.booking_id, formatted);
    }

    // Realtime notification to assistant room, booking room, and admin
    const socketIO = getIO ? getIO() : null;
    if (socketIO) {
      const ratingEventPayload = {
        bookingId: booking.id,
        booking_id: booking.id,
        bookingCode: booking.booking_id,
        assistantId: booking.assistant_id,
        assistant_id: booking.assistant_id,
        rating,
        review: finalReview,
        averageRating: assistantAvgRating,
        average_rating: assistantAvgRating,
        totalRatings: assistantTotalRatings,
        total_ratings: assistantTotalRatings,
        timestamp: new Date().toISOString(),
      };
      socketIO.to(`assistant_${booking.assistant_id}`).emit('rating_submitted', ratingEventPayload);
      socketIO.to(`user_${booking.assistant_id}`).emit('rating_submitted', ratingEventPayload);
      socketIO.to(`booking_${booking.id}`).emit('rating_submitted', ratingEventPayload);
      if (booking.booking_id && booking.booking_id !== booking.id) {
        socketIO.to(`booking_${booking.booking_id}`).emit('rating_submitted', ratingEventPayload);
      }
      socketIO.to('admin_room').emit('rating_submitted', ratingEventPayload);
    }

    return res.json({
      success: true,
      message: 'Feedback submitted successfully.',
      booking: formatted,
      rating,
      review: finalReview,
      average_rating: assistantAvgRating,
      total_ratings: assistantTotalRatings,
    });

  } catch (error) {
    console.error(
      'RATE BOOKING SERVER ERROR:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to submit rating.'
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET BOOKING SUMMARY
|--------------------------------------------------------------------------
|
| GET /api/bookings/:id/summary
|
| Validates authenticated user (passenger ownership, assigned assistant, or admin)
| Retrieves completed or active booking with full journey, assistant & feedback details.
|
|--------------------------------------------------------------------------
*/

exports.getBookingSummary = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const { booking, error } = await resolveBooking(
      supabase,
      req.params.id,
      '*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)'
    );

    if (error) {
      console.error('GET BOOKING SUMMARY ERROR:', error);
      return res.status(400).json({ success: false, message: error.message });
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Trip summary not found.' });
    }

    const isPassenger = booking.passenger_id === req.user.id;
    const isAssistant = booking.assistant_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isPassenger && !isAssistant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this trip summary.'
      });
    }

    if (booking.assistant && booking.assistant_id) {
      try {
        const { data: assistantJobs } = await supabase
          .from('bookings')
          .select('rating, booking_status')
          .eq('assistant_id', booking.assistant_id);

        if (assistantJobs) {
          const completed = assistantJobs.filter((j) => j.booking_status === 'completed');
          const rated = completed.filter((j) => j.rating && Number(j.rating) > 0);
          const avg = rated.length
            ? (rated.reduce((s, j) => s + Number(j.rating), 0) / rated.length).toFixed(1)
            : null;
          booking.assistant.completed_jobs = completed.length;
          booking.assistant.rating = avg;
        }
      } catch (err) {
        // Non-blocking assistant stats
      }
    }

    const includeOTP = isPassenger || isAdmin;
    const formatted = formatBooking(booking, { includeOTP });

    return res.json({
      success: true,
      summary: formatted,
      booking: formatted
    });

  } catch (error) {
    console.error('GET BOOKING SUMMARY SERVER ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load trip summary. Please try again.'
    });
  }
};


/*
|--------------------------------------------------------------------------
| ADMIN - GET ALL BOOKINGS
|--------------------------------------------------------------------------
|
| GET /api/bookings
|
|--------------------------------------------------------------------------
*/

exports.getAllBookings = async (req, res) => {
  try {

    if (
      !req.user ||
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Admin access required.'
      });
    }


    const {
      data: bookings,
      error
    } = await supabase
      .from('bookings')
      .select('*')
      .order(
        'created_at',
        {
          ascending: false
        }
      )
      .order(
        'id',
        {
          ascending: false
        }
      );


    if (error) {
      console.error(
        'GET ALL BOOKINGS ERROR:',
        error
      );

      return res.status(400).json({
        message: error.message
      });
    }


    return res.json(
      bookings || []
    );

  } catch (error) {
    console.error(
      'GET ALL BOOKINGS SERVER ERROR:',
      error
    );

    return res.status(500).json({
      message: 'Unable to load bookings.'
    });
  }
};
exports.assignAssistant = async (req, res) => {
  try {
    return res.status(501).json({
      message: 'Assign assistant endpoint is not implemented yet.'
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to assign assistant.'
    });
  }
};

exports.processPayment = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { booking, error } = await resolveBooking(supabase, req.params.id);
    if (error || !booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const isPassenger = booking.passenger_id === req.user.id;
    const isAssistant = booking.assistant_id && booking.assistant_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isPassenger && !isAssistant && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to view payment details for this booking.' });
    }

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking.id)
      .maybeSingle();

    return res.json({
      message: 'Payment details retrieved. Phase 1 online payments remain in pending gateway verification.',
      booking_id: booking.id,
      payment_status: booking.payment_status,
      payment: payment || null
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to retrieve payment information.'
    });
  }
};

/**
 * Authoritative service update helper used by updateBookingServices and updateBooking.
 */
async function processServiceUpdate(booking, services, reqUser) {
  if (reqUser && booking.passenger_id && booking.passenger_id !== reqUser.id && reqUser.role !== 'admin') {
    throw {
      status: 403,
      message: 'You are not authorized to update this booking.'
    };
  }

  const currentStatus = String(booking.booking_status || booking.status || '').toLowerCase();
  if (['in_service', 'in_progress', 'completed', 'cancelled', 'canceled'].includes(currentStatus)) {
    throw {
      status: 400,
      message: 'Services can no longer be edited for this booking.'
    };
  }

  if (!services || typeof services !== 'object') {
    throw {
      status: 400,
      message: 'Please provide valid services to update.'
    };
  }

  // Normalize services (handle luggageCounts vs luggage object/count)
  const normalizedServices = { ...(services || {}) };
  if (normalizedServices.luggage && typeof normalizedServices.luggage === 'object') {
    if (!normalizedServices.luggageCounts) {
      normalizedServices.luggageCounts = normalizedServices.luggage;
    }
    const tot = (Number(normalizedServices.luggage.small) || 0) + (Number(normalizedServices.luggage.medium) || 0) + (Number(normalizedServices.luggage.large) || 0);
    normalizedServices.luggage = tot;
  }

  // Authoritative pricing recalculation
  const pricingResult = calculateBookingPrice(normalizedServices);

  // Preserve journey protection if previously active on booking
  const hasProtection = Boolean(
    booking.services?.has_journey_protection ||
    (Array.isArray(booking.services?.pricing_breakdown) && booking.services.pricing_breakdown.some((b) => b.service === 'journey_protection'))
  );

  let finalTotalPrice = pricingResult.total;
  if (hasProtection) {
    finalTotalPrice = Number((pricingResult.total + 0.50).toFixed(2));
    pricingResult.total = finalTotalPrice;
    pricingResult.breakdown.push({
      service: 'journey_protection',
      label: 'ONECOOLIE Journey Protection (Pre-Launch)',
      quantity: 1,
      unit_price: 0.50,
      total: 0.50
    });
  }

  const selectedServices = buildServiceData(normalizedServices);
  if (selectedServices.length === 0) {
    throw { status: 400, message: 'Please select at least one assistance service.' };
  }
  const serviceText = selectedServices.join(', ');

  const existingServices = (booking.services && typeof booking.services === 'object') ? booking.services : {};
  const serviceDescription = buildServiceDescription(serviceText, {
    coach: booking.coach || existingServices.coach,
    seat_number: booking.seat_number || existingServices.seat_number,
    berth_type: booking.berth_type || existingServices.berth_type,
    action_type: existingServices.action_type || 'load_to_seat',
    journey_time: booking.journey_time
  });

  const mergedServices = {
    ...existingServices,
    ...services,
    pricing_breakdown: pricingResult.breakdown,
    has_journey_protection: hasProtection,
  };
  if (services.luggage_details) {
    mergedServices.luggage_details = services.luggage_details;
  }

  const updatePayload = {
    services: mergedServices,
    service: serviceText,
    service_description: serviceDescription,
    total_price: finalTotalPrice,
    updated_at: new Date().toISOString()
  };

  // Update pending payment record if applicable (cash or pending payment)
  if (booking.payment_status === 'pending' || booking.payment_method === 'cash') {
    try {
      await supabase
        .from('payments')
        .update({ amount: finalTotalPrice, updated_at: new Date().toISOString() })
        .eq('booking_id', booking.id)
        .eq('status', 'pending');
    } catch (payErr) {
      console.warn('[UPDATE SERVICES] Payment update warning:', payErr?.message);
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update(updatePayload)
    .eq('id', booking.id)
    .select('*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)')
    .single();

  if (updateError) {
    throw { status: 400, message: updateError.message };
  }

  const formatted = formatBooking(updated, { includeOTP: true });
  try {
    const io = getIO();
    if (io) {
      io.to(`booking_${booking.id}`).emit('status_update', formatted);
      io.to(`passenger_${booking.passenger_id}`).emit('status_update', formatted);
      if (updated.assistant_id) {
        io.to(`assistant_${updated.assistant_id}`).emit('status_update', formatBooking(updated, { includeOTP: false }));
      }
      io.to('admin_room').emit('status_update', formatBooking(updated, { includeOTP: false }));
    }
  } catch (e) {}

  return formatted;
}

exports.updateBookingServices = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { booking, error: findError } = await resolveBooking(supabase, req.params.id);

    if (findError || !booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.passenger_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to update this booking.' });
    }

    const formatted = await processServiceUpdate(booking, req.body.services, req.user);

    return res.status(200).json({
      success: true,
      message: 'Services updated successfully.',
      booking: formatted,
      ...formatted
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || 'Server error while updating services.'
    });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { booking, error: findError } = await resolveBooking(supabase, req.params.id);

    if (findError || !booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.passenger_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not authorized to update this booking.' });
    }

    // If services update is provided, use processServiceUpdate
    if (req.body.services && typeof req.body.services === 'object') {
      const formatted = await processServiceUpdate(booking, req.body.services, req.user);
      return res.json({
        success: true,
        message: 'Services updated successfully.',
        booking: formatted,
        ...formatted
      });
    }

    const currentStatus = String(booking.booking_status || '').toLowerCase();
    if (['in_service', 'completed', 'cancelled'].includes(currentStatus)) {
      return res.status(400).json({ message: 'Cannot edit booking at this stage.' });
    }

    const { coach, seat_number, berth_type, journey_date, journey_time } = req.body;
    const updateData = {};
    if (coach !== undefined) updateData.coach = coach.trim().toUpperCase();
    if (seat_number !== undefined) updateData.seat_number = seat_number.trim().toUpperCase();
    if (berth_type !== undefined) updateData.berth_type = berth_type;
    if (journey_date !== undefined) updateData.journey_date = journey_date;
    if (journey_time !== undefined) updateData.journey_time = journey_time;
    updateData.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', booking.id)
      .select('*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)')
      .single();

    if (updateError) {
      return res.status(400).json({ message: updateError.message });
    }

    const formatted = formatBooking(updated, { includeOTP: true });
    try {
      const io = getIO();
      if (io) {
        io.to(`booking_${booking.id}`).emit('status_update', formatted);
        io.to(`passenger_${booking.passenger_id}`).emit('status_update', formatted);
        io.to('admin_room').emit('status_update', formatBooking(updated, { includeOTP: false }));
        if (updated.assistant_id) {
          io.to(`assistant_${updated.assistant_id}`).emit('status_update', formatBooking(updated, { includeOTP: false }));
        }
      }
    } catch (e) { }

    return res.json(formatted);
  } catch (error) {
    console.error('UPDATE BOOKING ERROR:', error);
    return res.status(error.status || 500).json({ message: error.message || 'Server error while updating booking.' });
  }
};

exports.processServiceUpdate = processServiceUpdate;