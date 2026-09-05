const supabase = require('../config/db');
const { formatBooking } = require('../utils/bookingFormatter');

let io = null;

// --------------------------------------------------
// SOCKET.IO INTEGRATION
// --------------------------------------------------

exports.setIO = (ioInstance) => {
  io = ioInstance;
};

exports.getIO = () => io;

/**
 * Broadcast a status_update to both the assistant and passenger sides,
 * and globally to the operations command center (admin).
 * OTP is NEVER sent through the socket – it can only be read from the
 * passenger's own booking view (/api/bookings/:id).
 */
exports.broadcast = (bookingId, booking) => {
  if (!io || !bookingId) return;

  // Strip OTP before broadcasting
  const {
    start_otp,
    start_otp_expires_at,
    start_otp_hash,
    ...safePayload
  } = booking || {};

  // Emit to specific booking room (for active passenger & assistant)
  io.to(`booking_${bookingId}`).emit('status_update', safePayload);
  // Emit globally (for admin command center)
  io.emit('status_update', safePayload);
};

// --------------------------------------------------
// INTERNAL HELPER - fetch and validate booking
// --------------------------------------------------

async function fetchBookingForAssistant(bookingId, assistantId) {
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, passenger:passenger_id(id, name, email, phone)')
    .eq('id', bookingId)
    .single();

  if (error) {
    return { error: { status: 400, message: error.message } };
  }

  if (!booking) {
    return { error: { status: 404, message: 'Job not found.' } };
  }

  if (booking.assistant_id !== assistantId) {
    return { error: { status: 403, message: 'You are not assigned to this job.' } };
  }

  return { booking };
}

// --------------------------------------------------
// UPDATE BOOKING STATUS (PATCH /service/:booking_id/status)
// --------------------------------------------------
//
// Supported transitions (assistant-driven):
//
//   accepted   → arriving     (pressing "I'm Arriving")
//   in_service → completed    (via status endpoint - requires payment)
//
// OTP verification is the ONLY path from arriving → in_service.
// --------------------------------------------------

exports.updateStatus = async (req, res) => {
  try {
    const { booking_id } = req.params;
    const { status } = req.body;

    if (!booking_id || !status) {
      return res.status(400).json({ message: 'Booking ID and status are required.' });
    }

    const { booking, error: fetchError } = await fetchBookingForAssistant(
      booking_id, req.user.id
    );

    if (fetchError) {
      return res.status(fetchError.status).json({ message: fetchError.message });
    }

    const current = booking.booking_status;

    // ── accepted → arriving ────────────────────────────────────────────────
    if (current === 'accepted' && status === 'arriving') {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          booking_status:   'arriving',
          assistant_status: 'arriving',
          updated_at:       new Date().toISOString(),
        })
        .eq('id', booking_id)
        .eq('assistant_id', req.user.id)
        .eq('booking_status', 'accepted')   // atomic guard
        .select('*, passenger:passenger_id(id, name, email, phone)')
        .single();

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      if (!data) {
        return res.status(409).json({ message: 'Booking status changed by another process. Please refresh.' });
      }

      const formatted = formatBooking(data);
      exports.broadcast(booking_id, formatted);
      return res.json(formatted);
    }

    // ── in_service → completed (requires payment) ─────────────────────────
    if (current === 'in_service' && status === 'completed') {
      if (booking.payment_status !== 'paid') {
        return res.status(400).json({
          message: 'Payment must be collected before completing the service.'
        });
      }

      const { data, error } = await supabase
        .from('bookings')
        .update({
          booking_status:   'completed',
          assistant_status: 'completed',
          completed_at:     new Date().toISOString(),
          updated_at:       new Date().toISOString(),
        })
        .eq('id', booking_id)
        .eq('assistant_id', req.user.id)
        .eq('booking_status', 'in_service') // atomic guard
        .select('*, passenger:passenger_id(id, name, email, phone)')
        .single();

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      if (!data) {
        return res.status(409).json({ message: 'Booking was already completed or changed.' });
      }

      const formatted = formatBooking(data);
      exports.broadcast(booking_id, formatted);
      return res.json(formatted);
    }

    // ── Disallow direct arriving → in_service via status (must use OTP endpoint)
    if (current === 'arriving' && status === 'in_service') {
      return res.status(400).json({
        message: 'OTP verification is required to start the service. Use the confirm-otp endpoint.'
      });
    }

    // ── already completed?
    if (current === 'completed') {
      return res.status(409).json({ message: 'This job is already completed.' });
    }

    return res.status(400).json({
      message: `Invalid status transition: ${current} → ${status}`
    });

  } catch (err) {
    console.error('UPDATE STATUS ERROR:', err);
    return res.status(500).json({ message: 'Unable to update booking status.' });
  }
};

// --------------------------------------------------
// CONFIRM START OTP (POST /service/:booking_id/confirm-otp)
// --------------------------------------------------
//
// arriving → in_service
//
// Validates the 6-digit OTP the passenger shows the assistant.
// --------------------------------------------------

exports.confirmStartOTP = async (req, res) => {
  try {
    const { booking_id } = req.params;
    const { otp } = req.body;

    // ── Validate OTP format
    if (!otp) {
      return res.status(400).json({ message: 'OTP is required.' });
    }

    const cleanOtp = String(otp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ message: 'OTP must be exactly 6 digits.' });
    }

    // ── Fetch booking (raw, we need start_otp to compare)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, passenger:passenger_id(id, name, email, phone)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    if (booking.assistant_id !== req.user.id) {
      return res.status(403).json({ message: 'You are not assigned to this job.' });
    }

    // ── Must be in 'arriving' state
    if (booking.booking_status !== 'arriving') {
      return res.status(400).json({
        message: 'OTP can only be verified after arriving. Current status: ' + booking.booking_status
      });
    }

    // ── OTP must exist
    if (!booking.start_otp) {
      return res.status(400).json({
        message: 'No OTP is available for this booking. Ask the passenger to check their app.'
      });
    }

    // ── Check OTP expiry
    if (
      booking.start_otp_expires_at &&
      new Date(booking.start_otp_expires_at) < new Date()
    ) {
      return res.status(400).json({
        message: 'This OTP has expired. Please ask the passenger to check their app for a refreshed OTP.'
      });
    }

    // ── Compare OTP
    if (String(booking.start_otp) !== cleanOtp) {
      return res.status(400).json({
        message: 'Invalid OTP. Ask the passenger for the OTP shown in their app.'
      });
    }

    // ── OTP verified: transition to in_service
    const { data, error } = await supabase
      .from('bookings')
      .update({
        booking_status:        'in_service',
        assistant_status:      'in_service',
        start_otp_verified:    true,
        start_otp:             null,        // clear OTP after use
        start_otp_expires_at:  null,
        service_started_at:    new Date().toISOString(),
        updated_at:            new Date().toISOString(),
      })
      .eq('id', booking_id)
      .eq('assistant_id', req.user.id)
      .eq('booking_status', 'arriving')    // atomic guard
      .select('*, passenger:passenger_id(id, name, email, phone)')
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    if (!data) {
      return res.status(409).json({ message: 'Booking status changed by another process. Please refresh.' });
    }

    const formatted = formatBooking(data);
    exports.broadcast(booking_id, formatted);

    return res.json(formatted);

  } catch (err) {
    console.error('CONFIRM OTP ERROR:', err);
    return res.status(500).json({ message: 'Unable to verify OTP.' });
  }
};

// --------------------------------------------------
// MARK PAYMENT AS PAID (POST /service/:booking_id/pay)
// --------------------------------------------------
//
// Accepts: { method: 'cash' } or { method: 'upi' }
//
// Requirements:
//   - Service must be in_service
//   - Payment cannot be recorded twice (409 on duplicate)
//   - Method must be cash or upi
// --------------------------------------------------

exports.markPaid = async (req, res) => {
  try {
    const { booking_id } = req.params;
    const { method } = req.body;

    // ── Validate method
    if (!method) {
      return res.status(400).json({ message: 'Payment method is required.' });
    }

    const normalizedMethod = String(method).toLowerCase().trim();

    if (!['cash', 'upi'].includes(normalizedMethod)) {
      return res.status(400).json({
        message: 'Invalid payment method. Allowed methods: cash, upi.'
      });
    }

    // ── Fetch and validate booking ownership
    const { booking, error: fetchError } = await fetchBookingForAssistant(
      booking_id, req.user.id
    );

    if (fetchError) {
      return res.status(fetchError.status).json({ message: fetchError.message });
    }

    // ── Must be in_service
    if (booking.booking_status !== 'in_service') {
      return res.status(400).json({
        message: 'Payment can only be recorded once the service has started (in_service).'
      });
    }

    // ── Reject duplicate payment
    if (booking.payment_status === 'paid') {
      return res.status(409).json({
        message: 'Payment has already been recorded for this booking.'
      });
    }

    const paymentId = `TXN-${normalizedMethod.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // ── Record payment atomically
    const { data, error } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_method: normalizedMethod,
        payment_id:     paymentId,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', booking_id)
      .eq('assistant_id', req.user.id)
      .eq('payment_status', 'pending')  // atomic guard against double-payment
      .select('*, passenger:passenger_id(id, name, email, phone)')
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    if (!data) {
      return res.status(409).json({ message: 'Payment was already recorded (concurrent request).' });
    }

    const formatted = formatBooking(data);
    exports.broadcast(booking_id, formatted);

    return res.json(formatted);

  } catch (err) {
    console.error('MARK PAID ERROR:', err);
    return res.status(500).json({ message: 'Unable to record payment.' });
  }
};

// --------------------------------------------------
// PASSENGER RATING (POST /service/:booking_id/rate)
// --------------------------------------------------

exports.rateBooking = async (req, res) => {
  try {
    const booking_id = req.params.booking_id || req.params.id;
    const { rating, review } = req.body;

    const numericRating = Number(rating);

    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, passenger_id, assistant_id, booking_status')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.passenger_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    if (booking.booking_status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate completed bookings.' });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({
        rating:     numericRating,
        review:     review ? String(review).slice(0, 1000) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .select('*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)')
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const formatted = formatBooking(data, { includeOTP: true });
    exports.broadcast(booking_id, formatted);

    return res.json(formatted);

  } catch (err) {
    console.error('RATE BOOKING ERROR:', err);
    return res.status(500).json({ message: 'Unable to submit rating.' });
  }
};

// --------------------------------------------------
// SOS (POST /service/:booking_id/sos)
// --------------------------------------------------

exports.triggerSOS = async (req, res) => {
  try {
    const { booking_id } = req.params;

    const { data: bookingRow, error: bookingError } = await supabase
      .from('bookings')
      .select('id, passenger_id, assistant_id, station_code, train_number')
      .eq('id', booking_id)
      .single();

    if (bookingError || !bookingRow) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const isPassenger = bookingRow.passenger_id === req.user.id;
    const isAssistant = bookingRow.assistant_id === req.user.id;

    if (!isPassenger && !isAssistant) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    // Update SOS in bookings table
    const { data: updatedBooking, error: updateErr } = await supabase
      .from('bookings')
      .update({
        sos_triggered: true,
        sos_triggered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .select('*, passenger:passenger_id(id, name, email, phone)')
      .single();

    if (updateErr) {
      console.error('SOS DB UPDATE ERROR:', updateErr);
    }

    // Insert into sos_alerts log if table exists
    await supabase
      .from('sos_alerts')
      .insert([
        {
          booking_id,
          passenger_id: bookingRow.passenger_id,
          station_code: bookingRow.station_code,
          train_no: bookingRow.train_number,
          status: 'active',
        },
      ])
      .catch(() => {});

    // Emit SOS alert via socket
    if (io) {
      io.emit('sos_alert', {
        booking_id,
        user_id: req.user.id,
        station_code: bookingRow.station_code,
        train_no: bookingRow.train_number,
      });
    }

    return res.json(formatBooking(updatedBooking || bookingRow));

  } catch (err) {
    console.error('SOS ERROR:', err);
    return res.status(500).json({ message: 'Unable to trigger SOS.' });
  }
};