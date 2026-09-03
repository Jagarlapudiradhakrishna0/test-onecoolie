const supabase = require('../config/db');
const { broadcast } = require('./serviceController');
const { formatBooking } = require('../utils/bookingFormatter');

const FRESH_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

// --------------------------------------------------
// ASSISTANT AVAILABILITY (POST /assistants/availability)
// --------------------------------------------------

exports.setAvailability = async (req, res) => {
  try {
    const { is_online, station_code } = req.body;

    const updates = { is_online: !!is_online };
    if (station_code) updates.station_code = station_code;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error || !data) {
      return res.status(401).json({ message: 'Session expired or user not found. Please log in again.' });
    }

    res.json(data);
  } catch (err) {
    console.error('SET AVAILABILITY ERROR:', err);
    res.status(500).json({ message: 'Unable to update availability.' });
  }
};

// --------------------------------------------------
// GET ASSISTANT PROFILE (GET /assistants/me)
// --------------------------------------------------

exports.getMe = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, station_code, is_online, is_approved')
      .eq('id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(401).json({ message: 'Session expired or user not found. Please log in again.' });
    }

    res.json(data);
  } catch (err) {
    console.error('GET ASSISTANT ERROR:', err);
    res.status(500).json({ message: 'Unable to load assistant profile.' });
  }
};

// --------------------------------------------------
// GET AVAILABLE BOOKINGS (GET /assistants/available)
// --------------------------------------------------

exports.getAvailableBookings = async (req, res) => {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('station_code, is_online')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }

    if (!user.is_online) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('*, passenger:passenger_id(id, name, email, phone)')
      .eq('station_code', user.station_code)
      .eq('booking_status', 'pending')
      .gte('created_at', new Date(Date.now() - FRESH_WINDOW_MS).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    // Never expose OTP in the available bookings list
    const formatted = (data || []).map((b) =>
      formatBooking(b, { includeOTP: false })
    );

    res.json(formatted);
  } catch (err) {
    console.error('GET AVAILABLE BOOKINGS ERROR:', err);
    res.status(500).json({ message: 'Unable to load available bookings.' });
  }
};

// --------------------------------------------------
// ACCEPT BOOKING (POST /assistants/:booking_id/accept)
// --------------------------------------------------
// Generates a 6-digit OTP for the passenger.
// Uses an atomic Supabase filter to prevent two assistants from
// accepting the same job simultaneously.
// --------------------------------------------------

exports.acceptBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;

    // Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('bookings')
      .update({
        assistant_id:          req.user.id,
        assistant_status:      'accepted',
        booking_status:        'accepted',
        start_otp:             otp,
        start_otp_verified:    false,
        start_otp_expires_at:  expiresAt,
        updated_at:            new Date().toISOString(),
      })
      .eq('id', booking_id)
      .eq('booking_status', 'pending')  // atomic guard: only accept pending jobs
      .select('*, passenger:passenger_id(id, name, email, phone)')
      .single();

    if (error) {
      console.error('ACCEPT BOOKING ERROR:', error);
      return res.status(400).json({ message: error.message });
    }

    if (!data) {
      return res.status(409).json({
        message: 'Booking already taken by another assistant or not found.'
      });
    }

    // Notify passenger (broadcast INCLUDES OTP so passenger can see it)
    // We broadcast the raw data (with OTP) to booking room.
    // The socket handler in index.js does NOT strip OTP from broadcasts so
    // the passenger can see it in ActiveBooking.
    broadcast(booking_id, {
      ...formatBooking(data),
      start_otp: data.start_otp,          // passenger needs this in ActiveBooking
    });

    // Return full booking to the ASSISTANT dashboard (does NOT need OTP)
    const formatted = formatBooking(data, { includeOTP: false });
    res.json(formatted);

  } catch (err) {
    console.error('ACCEPT BOOKING SERVER ERROR:', err);
    res.status(500).json({ message: 'Unable to accept booking.' });
  }
};

// --------------------------------------------------
// GET MY JOBS (GET /assistants/my-jobs)
// --------------------------------------------------

exports.getMyJobs = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, passenger:passenger_id(id, name, email, phone)')
      .eq('assistant_id', req.user.id)
      .in('booking_status', ['accepted', 'arriving', 'in_service', 'completed'])
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    // Never expose start_otp to the assistant
    const formatted = (data || []).map((b) =>
      formatBooking(b, { includeOTP: false })
    );

    res.json(formatted);
  } catch (err) {
    console.error('GET MY JOBS ERROR:', err);
    res.status(500).json({ message: 'Unable to load jobs.' });
  }
};

// --------------------------------------------------
// COMPLETE BOOKING (POST /assistants/:booking_id/complete)
// --------------------------------------------------
// Requirements:
//   - Caller must be the assigned assistant
//   - Status must be in_service
//   - payment_status must be paid
//   - Reject duplicate completion with 409
// --------------------------------------------------

exports.completeBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, assistant_id, booking_status, payment_status')
      .eq('id', booking_id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    if (booking.assistant_id !== req.user.id) {
      return res.status(403).json({ message: 'You are not assigned to this job.' });
    }

    // Guard against double-completion
    if (booking.booking_status === 'completed') {
      return res.status(409).json({ message: 'This job is already completed.' });
    }

    if (booking.booking_status !== 'in_service') {
      return res.status(400).json({
        message: `Service must be in progress before completing. Current status: ${booking.booking_status}`
      });
    }

    // Require payment before completing
    if (booking.payment_status !== 'paid') {
      return res.status(400).json({
        message: 'Payment must be collected before completing the service.'
      });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({
        assistant_status: 'completed',
        booking_status:   'completed',
        completed_at:     new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      })
      .eq('id', booking_id)
      .eq('assistant_id', req.user.id)
      .eq('booking_status', 'in_service')  // atomic guard
      .select('*, passenger:passenger_id(id, name, email, phone)')
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    if (!data) {
      return res.status(409).json({ message: 'Job was already completed (concurrent request).' });
    }

    const formatted = formatBooking(data);
    broadcast(booking_id, formatted);

    res.json(formatted);
  } catch (err) {
    console.error('COMPLETE BOOKING ERROR:', err);
    res.status(500).json({ message: 'Unable to complete booking.' });
  }
};

// --------------------------------------------------
// CANCEL BY ASSISTANT (POST /assistants/:booking_id/cancel)
// --------------------------------------------------
// Allowed from: accepted, arriving
// Returns the booking to the pending pool.
// Returns { booking: <formatted> } so that
//   onUpdate(data?.booking || data) works in AssistantJobCard.
// --------------------------------------------------

exports.cancelByAssistant = async (req, res) => {
  try {
    const { booking_id } = req.params;

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, assistant_id, booking_status')
      .eq('id', booking_id)
      .single();

    if (fetchError || !booking) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    if (booking.assistant_id !== req.user.id) {
      return res.status(403).json({ message: 'You are not assigned to this job.' });
    }

    if (!['accepted', 'arriving'].includes(booking.booking_status)) {
      return res.status(400).json({
        message: 'Job cannot be cancelled at this stage. Service has already started.'
      });
    }

    // Release the job back to the pool
    const { data, error } = await supabase
      .from('bookings')
      .update({
        assistant_id:          null,
        assistant_status:      'pending',
        booking_status:        'pending',
        start_otp:             null,
        start_otp_verified:    false,
        start_otp_expires_at:  null,
        updated_at:            new Date().toISOString(),
      })
      .eq('id', booking_id)
      .select('*, passenger:passenger_id(id, name, email, phone)')
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const formatted = formatBooking(data);
    broadcast(booking_id, formatted);

    // AssistantJobCard does: onUpdate(data?.booking || data)
    // We return { booking: formatted } so both patterns work.
    res.json({ booking: formatted, ...formatted });

  } catch (err) {
    console.error('ASSISTANT CANCEL ERROR:', err);
    res.status(500).json({ message: 'Could not cancel booking.' });
  }
};

// --------------------------------------------------
// GET ONLINE ASSISTANTS (GET /assistants/online?station=KZJ)
// --------------------------------------------------

exports.getOnlineAssistants = async (req, res) => {
  try {
    const { station } = req.query;

    if (!station) {
      return res.status(400).json({ message: 'Station is required.' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'assistant')
      .eq('is_approved', true)
      .eq('is_online', true)
      .eq('station_code', station);

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const results = [];

    for (const assistant of data || []) {
      const { data: jobs } = await supabase
        .from('bookings')
        .select('rating, booking_status')
        .eq('assistant_id', assistant.id);

      const completed = (jobs || []).filter((j) => j.booking_status === 'completed');
      const rated     = completed.filter((j) => j.rating);
      const avg       = rated.length
        ? (rated.reduce((s, j) => s + Number(j.rating), 0) / rated.length).toFixed(1)
        : null;

      results.push({
        id:     assistant.id,
        name:   assistant.name,
        rating: avg,
        jobs:   completed.length,
      });
    }

    res.json(results);
  } catch (err) {
    console.error('GET ONLINE ASSISTANTS ERROR:', err);
    res.status(500).json({ message: 'Unable to load online assistants.' });
  }
};
