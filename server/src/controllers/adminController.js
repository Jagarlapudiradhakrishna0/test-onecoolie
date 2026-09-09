const supabase = require('../config/db');
const { formatBooking } = require('../utils/bookingFormatter');
const { broadcast } = require('./serviceController');
const { resolveBooking } = require('../utils/bookingResolver');
const { PLATFORM_COMMISSION_PERCENT } = require('../config/commission');
const { recordAssistantEarningOnCompletion } = require('../utils/earningsService');
const { logAdminAction, getAdminAuditLogs } = require('../services/adminAuditService');

// --------------------------------------------------
// PLATFORM STATS & METRICS (GET /admin/stats)
// --------------------------------------------------
exports.getStats = async (req, res) => {
  try {
    // 1. Fetch bookings summary
    const { data: bookings, error: bErr } = await supabase
      .from('bookings')
      .select('id, total_price, payment_status, payment_method, booking_status, station_code, sos_triggered, created_at');

    if (bErr) throw bErr;

    // 2. Fetch users summary
    const { data: users, error: uErr } = await supabase
      .from('users')
      .select('id, role, is_approved, is_online');

    if (uErr) throw uErr;

    const allBookings = bookings || [];
    const allUsers = users || [];

    const totalBookings = allBookings.length;
    const pendingAssistants = allUsers.filter(u => u.role === 'assistant' && !u.is_approved).length;
    const totalAssistants = allUsers.filter(u => u.role === 'assistant').length;
    const onlineAssistants = allUsers.filter(u => u.role === 'assistant' && u.is_online).length;
    const totalPassengers = allUsers.filter(u => u.role === 'passenger').length;

    // Revenue calculations (Phase 1 Platform Commission & Sahayak Split)
    const grossRevenue = allBookings
      .filter(b => b.payment_status === 'paid')
      .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

    // Phase 3A: Refund accounting
    let totalRefunded = 0;
    let pendingRefundsCount = 0;
    let failedRefundsCount = 0;
    try {
      const { data: refundsData } = await supabase
        .from('refunds')
        .select('id, amount, status');
      if (refundsData) {
        totalRefunded = refundsData
          .filter(r => r.status === 'processed')
          .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        totalRefunded = Math.round(totalRefunded * 100) / 100;
        pendingRefundsCount = refundsData.filter(r => ['pending', 'processing'].includes(r.status)).length;
        failedRefundsCount = refundsData.filter(r => r.status === 'failed').length;
      }
    } catch (refErr) {
      // Table may not exist yet in unmigrated environment
    }

    // Phase 3B: Assistant Earnings & Payouts breakdown
    let assistantEarningsPending = 0;
    let assistantEarningsAvailable = 0;
    let assistantEarningsHeld = 0;
    let assistantEarningsPaidOut = 0;
    try {
      const { data: earningsData } = await supabase
        .from('assistant_earnings')
        .select('id, assistant_amount, status');
      if (earningsData) {
        earningsData.forEach((e) => {
          const amt = Number(e.assistant_amount) || 0;
          if (e.status === 'pending') assistantEarningsPending += amt;
          else if (e.status === 'available') assistantEarningsAvailable += amt;
          else if (e.status === 'held') assistantEarningsHeld += amt;
          else if (e.status === 'paid_out') assistantEarningsPaidOut += amt;
        });
        assistantEarningsPending = Math.round(assistantEarningsPending * 100) / 100;
        assistantEarningsAvailable = Math.round(assistantEarningsAvailable * 100) / 100;
        assistantEarningsHeld = Math.round(assistantEarningsHeld * 100) / 100;
        assistantEarningsPaidOut = Math.round(assistantEarningsPaidOut * 100) / 100;
      }
    } catch (eErr) {}

    let payoutsRequested = 0;
    let payoutsProcessing = 0;
    let payoutsFailed = 0;
    let totalPayoutsPaid = 0;
    try {
      const { data: payoutsData } = await supabase
        .from('assistant_payouts')
        .select('id, amount, status');
      if (payoutsData) {
        payoutsRequested = payoutsData.filter(p => p.status === 'requested').length;
        payoutsProcessing = payoutsData.filter(p => p.status === 'processing').length;
        payoutsFailed = payoutsData.filter(p => p.status === 'failed').length;
        totalPayoutsPaid = payoutsData
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        totalPayoutsPaid = Math.round(totalPayoutsPaid * 100) / 100;
      }
    } catch (pErr) {}

    // Net Revenue = Gross Revenue - Total Refunded
    const netRevenue = Math.max(0, Math.round((grossRevenue - totalRefunded) * 100) / 100);

    const platformCommissionPercent = PLATFORM_COMMISSION_PERCENT; // 20%
    const platformRevenue = Math.round((netRevenue * platformCommissionPercent) / 100 * 100) / 100;
    const assistantEarningsOwed = Math.round((netRevenue - platformRevenue) * 100) / 100;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayBookingsList = allBookings.filter(b => b.created_at && b.created_at.startsWith(todayStr));
    const todayBookings = todayBookingsList.length;
    const todayGrossRevenue = todayBookingsList
      .filter(b => b.payment_status === 'paid')
      .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
    const todayPlatformRevenue = Math.round((todayGrossRevenue * platformCommissionPercent) / 100 * 100) / 100;

    const pendingPaymentsCount = allBookings.filter(b => b.payment_status === 'pending').length;
    const failedPaymentsCount = allBookings.filter(b => b.payment_status === 'failed').length;

    // Active SOS
    const activeSOS = allBookings.filter(b => b.sos_triggered).length;

    // Status breakdown
    const statusBreakdown = {
      pending: 0,
      accepted: 0,
      arriving: 0,
      in_service: 0,
      completed: 0,
      cancelled: 0,
    };
    allBookings.forEach(b => {
      const s = b.booking_status || 'pending';
      if (statusBreakdown[s] !== undefined) {
        statusBreakdown[s]++;
      } else {
        statusBreakdown[s] = 1;
      }
    });

    // Station breakdown
    const stationMap = {};
    allBookings.forEach(b => {
      const stn = b.station_code || 'OTHER';
      if (!stationMap[stn]) stationMap[stn] = { station: stn, bookings: 0, revenue: 0 };
      stationMap[stn].bookings++;
      if (b.payment_status === 'paid') {
        stationMap[stn].revenue += Number(b.total_price) || 0;
      }
    });
    const stationStats = Object.values(stationMap);

    // Payment method breakdown
    const paymentMap = {};
    allBookings.forEach(b => {
      const m = b.payment_method || 'other';
      paymentMap[m] = (paymentMap[m] || 0) + 1;
    });

    res.json({
      totalBookings,
      pendingAssistants,
      totalAssistants,
      onlineAssistants,
      totalPassengers,
      revenue: grossRevenue, // backward compatible
      grossRevenue,
      netRevenue,
      totalRefunded,
      pendingRefunds: pendingRefundsCount,
      failedRefunds: failedRefundsCount,
      platformRevenue,
      assistantEarningsOwed,
      assistantEarningsPending,
      assistantEarningsAvailable,
      assistantEarningsHeld,
      assistantEarningsPaidOut,
      payoutsRequested,
      payoutsProcessing,
      payoutsFailed,
      totalPayoutsPaid,
      todayRevenue: todayGrossRevenue, // backward compatible
      todayGrossRevenue,
      todayPlatformRevenue,
      todayBookings,
      activeSOS,
      pendingPaymentsCount,
      failedPaymentsCount,
      commissionPercent: platformCommissionPercent,
      statusBreakdown,
      stationStats,
      paymentMap,
    });
  } catch (err) {
    console.error('ADMIN STATS ERROR:', err);
    res.status(500).json({ message: 'Unable to load platform stats.' });
  }
};

// --------------------------------------------------
// PENDING ASSISTANTS (GET /admin/pending-assistants)
// --------------------------------------------------
exports.getPendingAssistants = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, station_code, kyc_status, kyc_documents, created_at')
      .eq('role', 'assistant')
      .eq('is_approved', false)
      .order('created_at', { ascending: true });

    if (error) return res.status(400).json({ message: error.message });
    res.json(data || []);
  } catch (err) {
    console.error('ADMIN PENDING ASSISTANTS ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch pending assistants.' });
  }
};

// --------------------------------------------------
// ALL ASSISTANTS (GET /admin/assistants)
// --------------------------------------------------
exports.getAssistants = async (req, res) => {
  try {
    const { data: assistants, error } = await supabase
      .from('users')
      .select('id, name, email, phone, station_code, is_approved, is_online, kyc_status, created_at')
      .eq('role', 'assistant')
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    // Fetch booking counts per assistant
    const { data: bookings } = await supabase
      .from('bookings')
      .select('assistant_id, booking_status');

    const bookingCounts = {};
    (bookings || []).forEach(b => {
      if (b.assistant_id) {
        if (!bookingCounts[b.assistant_id]) {
          bookingCounts[b.assistant_id] = { total: 0, completed: 0 };
        }
        bookingCounts[b.assistant_id].total++;
        if (b.booking_status === 'completed') {
          bookingCounts[b.assistant_id].completed++;
        }
      }
    });

    const enriched = (assistants || []).map(a => ({
      ...a,
      total_missions: bookingCounts[a.id]?.total || 0,
      completed_missions: bookingCounts[a.id]?.completed || 0,
    }));

    res.json(enriched);
  } catch (err) {
    console.error('ADMIN ALL ASSISTANTS ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch assistants roster.' });
  }
};

// --------------------------------------------------
// APPROVE ASSISTANT (POST /admin/assistants/:id/approve)
// --------------------------------------------------
exports.approveAssistant = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ is_approved: true, kyc_status: 'approved' })
      .eq('id', req.params.id)
      .eq('role', 'assistant')
      .select();

    if (error || !data || data.length === 0) {
      return res.status(400).json({ message: 'Assistant not found or update failed.' });
    }

    await logAdminAction({
      req,
      action: 'assistant_approved',
      resource_type: 'assistant',
      resource_id: req.params.id,
      result: 'success',
      metadata: {
        before: { is_approved: false, kyc_status: 'pending' },
        after: { is_approved: true, kyc_status: 'approved' },
        assistant_name: data[0]?.name,
        assistant_phone: data[0]?.phone
      }
    });

    res.json({ message: 'Assistant approved successfully.', user: data[0] });
  } catch (err) {
    console.error('ADMIN APPROVE ERROR:', err);
    res.status(500).json({ message: 'Failed to approve assistant.' });
  }
};

// --------------------------------------------------
// REJECT ASSISTANT (POST /admin/assistants/:id/reject)
// --------------------------------------------------
exports.rejectAssistant = async (req, res) => {
  try {
    const { reason } = req.body || {};
    const { data, error } = await supabase
      .from('users')
      .update({
        is_approved: false,
        kyc_status: 'rejected',
        kyc_rejection_reason: reason || 'Application rejected by administration.',
      })
      .eq('id', req.params.id)
      .eq('role', 'assistant')
      .select();

    if (error) return res.status(400).json({ message: error.message });

    await logAdminAction({
      req,
      action: 'assistant_rejected',
      resource_type: 'assistant',
      resource_id: req.params.id,
      result: 'success',
      metadata: {
        before: { is_approved: false, kyc_status: 'pending' },
        after: { is_approved: false, kyc_status: 'rejected' },
        reason: reason || 'Application rejected by administration.',
        assistant_name: data?.[0]?.name
      }
    });

    res.json({ message: 'Assistant application rejected.', user: data?.[0] });
  } catch (err) {
    console.error('ADMIN REJECT ERROR:', err);
    res.status(500).json({ message: 'Failed to reject assistant.' });
  }
};

// --------------------------------------------------
// MASTER BOOKING LEDGER (GET /admin/bookings)
// --------------------------------------------------
exports.getAllBookings = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        passenger:passenger_id(id, name, email, phone),
        assistant:assistant_id(id, name, email, phone, station_code, is_online)
      `)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    const formatted = (data || []).map(b => formatBooking(b, { includeOTP: true }));
    res.json(formatted);
  } catch (err) {
    console.error('ADMIN ALL BOOKINGS ERROR:', err);
    res.status(500).json({ message: 'Unable to load bookings.' });
  }
};

// --------------------------------------------------
// SINGLE BOOKING DETAILS (GET /admin/bookings/:id)
// --------------------------------------------------
exports.getBookingById = async (req, res) => {
  try {
    const { booking: data, error } = await resolveBooking(
      supabase,
      req.params.id,
      `
        *,
        passenger:passenger_id(id, name, email, phone),
        assistant:assistant_id(id, name, email, phone, station_code, is_online)
      `
    );

    if (error || !data) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const formatted = formatBooking(data, { includeOTP: true });
    res.json(formatted);
  } catch (err) {
    console.error('ADMIN GET BOOKING ERROR:', err);
    res.status(500).json({ message: 'Unable to load booking details.' });
  }
};

// --------------------------------------------------
// UPDATE BOOKING (PATCH /admin/bookings/:id)
// --------------------------------------------------
exports.updateBooking = async (req, res) => {
  try {
    const {
      booking_status,
      assistant_status,
      payment_status,
      assistant_id,
      sos_triggered,
    } = req.body;

    const updates = {};
    if (booking_status !== undefined) {
      updates.booking_status = booking_status;
      if (booking_status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      if (booking_status === 'in_service') {
        updates.service_started_at = new Date().toISOString();
        updates.start_otp_verified = true;
      }
    }
    if (assistant_status !== undefined) {
      updates.assistant_status = assistant_status;
    } else if (booking_status !== undefined) {
      updates.assistant_status = booking_status;
    }
    if (payment_status !== undefined) {
      updates.payment_status = payment_status;
    }
    if (assistant_id !== undefined) {
      updates.assistant_id = assistant_id === '' ? null : assistant_id;
    }
    if (sos_triggered !== undefined) {
      updates.sos_triggered = sos_triggered;
    }

    const client = req.supabase || supabase;
    const { booking: targetBooking, error: resolveErr } = await resolveBooking(client, req.params.id);
    if (resolveErr || !targetBooking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    // Phase 6 Security Rule: Admins strictly prohibited from manually marking online payments as paid
    if (payment_status === 'paid' && targetBooking.payment_method !== 'cash') {
      return res.status(400).json({
        message: 'Security Policy: Admins are strictly prohibited from manually marking online payments as paid. Online payments must be finalized by gateway webhooks or HMAC signature verification.'
      });
    }

    const { data, error } = await client
      .from('bookings')
      .update(updates)
      .eq('id', targetBooking.id)
      .select(`
        *,
        passenger:passenger_id(id, name, email, phone),
        assistant:assistant_id(id, name, email, phone, station_code, is_online)
      `)
      .single();

    if (error || !data) {
      return res.status(400).json({ message: error?.message || 'Update failed.' });
    }

    // Sync payments table status if payment_status was updated
    if (payment_status !== undefined) {
      try {
        await supabase
          .from('payments')
          .update({ status: payment_status, updated_at: new Date().toISOString() })
          .eq('booking_id', targetBooking.id);
      } catch (pErr) {}
    }

    // If completed and payment is paid, ensure assistant earnings are generated
    if (data.booking_status === 'completed' && data.payment_status === 'paid' && data.assistant_id) {
      await recordAssistantEarningOnCompletion(supabase, data);
    }

    const formatted = formatBooking(data, { includeOTP: true });

    // Broadcast status change to booking room
    broadcast(req.params.id, formatted);

    await logAdminAction({
      req,
      action: 'booking_updated',
      resource_type: 'booking',
      resource_id: targetBooking.id,
      result: 'success',
      metadata: {
        before: {
          booking_status: targetBooking.booking_status,
          assistant_id: targetBooking.assistant_id,
          payment_status: targetBooking.payment_status
        },
        after: {
          booking_status: data.booking_status,
          assistant_id: data.assistant_id,
          payment_status: data.payment_status
        },
        updates
      }
    });

    res.json(formatted);
  } catch (err) {
    console.error('ADMIN UPDATE BOOKING ERROR:', err);
    res.status(500).json({ message: 'Failed to update booking.' });
  }
};

// --------------------------------------------------
// ALL USERS DIRECTORY (GET /admin/users)
// --------------------------------------------------
exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = supabase
      .from('users')
      .select('id, name, email, phone, role, station_code, is_approved, is_online, created_at')
      .order('created_at', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }

    const { data: users, error } = await query;
    if (error) return res.status(400).json({ message: error.message });

    // Join with booking aggregates for passengers
    const { data: bookings } = await supabase
      .from('bookings')
      .select('passenger_id, total_price, payment_status');

    const userStats = {};
    (bookings || []).forEach(b => {
      if (b.passenger_id) {
        if (!userStats[b.passenger_id]) {
          userStats[b.passenger_id] = { count: 0, totalSpend: 0 };
        }
        userStats[b.passenger_id].count++;
        if (b.payment_status === 'paid') {
          userStats[b.passenger_id].totalSpend += Number(b.total_price) || 0;
        }
      }
    });

    const enriched = (users || []).map(u => ({
      ...u,
      bookings_count: userStats[u.id]?.count || 0,
      total_spent: userStats[u.id]?.totalSpend || 0,
    }));

    res.json(enriched);
  } catch (err) {
    console.error('ADMIN ALL USERS ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch users directory.' });
  }
};

// --------------------------------------------------
// UPDATE USER (PATCH /admin/users/:id)
// --------------------------------------------------
exports.updateUser = async (req, res) => {
  try {
    // Phase 2B/2C: Strict Privilege Escalation Protection
    if (req.body.role !== undefined || req.body.admin_role !== undefined) {
      return res.status(400).json({
        message: 'Role and admin_role modifications are not permitted through generic user update. Privileges cannot be escalated through this endpoint.'
      });
    }

    const forbiddenFields = ['role', 'admin_role', 'is_admin', 'admin', 'permissions', 'balance', 'wallet_balance', 'password', 'email', 'id'];
    for (const field of forbiddenFields) {
      if (req.body[field] !== undefined) {
        return res.status(400).json({
          message: `Field '${field}' cannot be modified through generic user update.`
        });
      }
    }

    const { station_code, phone, is_approved, is_online } = req.body;
    const updates = {};
    if (station_code !== undefined) updates.station_code = station_code;
    if (phone !== undefined) updates.phone = phone;
    if (is_approved !== undefined) updates.is_approved = is_approved;
    if (is_online !== undefined) updates.is_online = is_online;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid update fields provided.' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, name, email, phone, role, station_code, is_approved, is_online, created_at')
      .single();

    if (error) return res.status(400).json({ message: error.message });

    await logAdminAction({
      req,
      action: 'user_updated',
      resource_type: 'user',
      resource_id: req.params.id,
      result: 'success',
      metadata: {
        updated_fields: Object.keys(updates),
        new_values: updates
      }
    });

    res.json(data);
  } catch (err) {
    console.error('ADMIN UPDATE USER ERROR:', err);
    res.status(500).json({ message: 'Failed to update user.' });
  }
};

// --------------------------------------------------
// DELETE USER (DELETE /admin/users/:id)
// --------------------------------------------------
exports.deleteUser = async (req, res) => {
  try {
    if (req.user?.id === req.params.id) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    // High-Risk Action: Mandatory DB audit write BEFORE destructive deletion
    await logAdminAction({
      req,
      action: 'user_deleted',
      resource_type: 'user',
      resource_id: req.params.id,
      result: 'success',
      metadata: {
        deleted_user_id: req.params.id
      }
    });

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(400).json({ message: error.message });

    res.json({ message: 'User account removed successfully.' });
  } catch (err) {
    console.error('ADMIN DELETE USER ERROR:', err);
    if (err.name === 'AuditLoggingError' || err.isHighRisk) {
      return res.status(500).json({ message: 'Security Policy Enforcement: Audit logging failed. User deletion aborted.' });
    }
    res.status(500).json({ message: 'Failed to delete user.' });
  }
};

// --------------------------------------------------
// SOS ALERTS (GET /admin/sos-alerts)
// --------------------------------------------------
exports.getSOSAlerts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        passenger:passenger_id(id, name, email, phone),
        assistant:assistant_id(id, name, email, phone, station_code)
      `)
      .eq('sos_triggered', true)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    const formatted = (data || []).map(b => formatBooking(b, { includeOTP: true }));
    res.json(formatted);
  } catch (err) {
    console.error('ADMIN SOS ALERTS ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch SOS alerts.' });
  }
};

// --------------------------------------------------
// RESOLVE SOS (POST /admin/sos-alerts/:id/resolve)
// --------------------------------------------------
exports.resolveSOS = async (req, res) => {
  try {
    const bookingId = req.params.id;

    // 1. Update booking
    const { data, error } = await supabase
      .from('bookings')
      .update({ sos_triggered: false })
      .eq('id', bookingId)
      .select(`
        *,
        passenger:passenger_id(id, name, email, phone),
        assistant:assistant_id(id, name, email, phone, station_code)
      `)
      .single();

    if (error) return res.status(400).json({ message: error.message });

    // 2. Update sos_alerts table if present
    await supabase
      .from('sos_alerts')
      .update({ status: 'resolved' })
      .eq('booking_id', bookingId);

    const formatted = formatBooking(data, { includeOTP: true });
    broadcast(bookingId, formatted);

    await logAdminAction({
      req,
      action: 'sos_resolved',
      resource_type: 'sos_alert',
      resource_id: bookingId,
      result: 'success',
      metadata: {
        before: { sos_triggered: true },
        after: { sos_triggered: false, status: 'resolved' }
      }
    });

    res.json({ message: 'Emergency alert marked as resolved.', booking: formatted });
  } catch (err) {
    console.error('ADMIN RESOLVE SOS ERROR:', err);
    res.status(500).json({ message: 'Failed to resolve emergency alert.' });
  }
};

// --------------------------------------------------
// CANCEL BOOKING BY ADMIN (POST /admin/bookings/:id/cancel)
// --------------------------------------------------
exports.cancelBookingByAdmin = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { reason = 'Cancelled by administrator' } = req.body || {};

    const { booking, error: findError } = await resolveBooking(supabase, bookingId);
    if (findError || !booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const { canAdminCancel, determineRefundEligibility } = require('../utils/cancellationRules');
    const { processBookingRefund } = require('../utils/refundService');
    const { reverseAssistantEarning } = require('../utils/earningsService');

    const ruleCheck = canAdminCancel(booking);
    if (!ruleCheck.allowed) {
      if (ruleCheck.isAlreadyCancelled) {
        return res.json({
          success: true,
          idempotent: true,
          message: 'Booking is already cancelled.',
          booking: formatBooking(booking, { includeOTP: false })
        });
      }
      return res.status(400).json({
        success: false,
        message: ruleCheck.reason || 'This booking cannot be cancelled.'
      });
    }

    // Fetch authoritative payment ledger row
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

    // Refund calculation & gateway dispatch
    const refundEligibility = determineRefundEligibility(booking, paymentRecord, 'admin');
    let refundResult = null;
    if (refundEligibility.requiresRefund && paymentRecord) {
      refundResult = await processBookingRefund(supabase, {
        booking,
        payment: paymentRecord,
        refundAmount: refundEligibility.refundAmount,
        reason,
        actorRole: 'admin',
        actorId: req.user?.id || 'admin'
      });
    }

    const nowIso = new Date().toISOString();
    const newPaymentStatus = refundResult?.success
      ? 'refunded'
      : (booking.payment_method === 'cash' || paymentRecord?.status === 'pending')
        ? 'cancelled'
        : booking.payment_status;

    let { data: updatedBooking, error: updateErr } = await supabase
      .from('bookings')
      .update({
        booking_status: 'cancelled',
        payment_status: newPaymentStatus,
        updated_at: nowIso
      })
      .eq('id', booking.id)
      .select('*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)')
      .single();

    if (updateErr && updateErr.message?.includes('bookings_payment_status_check')) {
      console.warn('bookings_payment_status_check constraint rejected cancelled status; falling back gracefully.');
      const fallbackStatus = refundResult?.success ? 'refunded' : (booking.payment_status === 'paid' ? 'refunded' : 'failed');
      const retryResult = await supabase
        .from('bookings')
        .update({
          booking_status: 'cancelled',
          payment_status: fallbackStatus,
          updated_at: nowIso
        })
        .eq('id', booking.id)
        .select('*, passenger:passenger_id(id, name, email, phone), assistant:assistant_id(id, name, email, phone, station_code)')
        .single();

      updatedBooking = retryResult.data;
      updateErr = retryResult.error;
    }

    if (updateErr) {
      return res.status(400).json({ message: updateErr.message });
    }

    if (paymentRecord?.id && paymentRecord.status === 'pending') {
      try {
        await supabase
          .from('payments')
          .update({ status: 'cancelled', updated_at: nowIso })
          .eq('id', paymentRecord.id);
      } catch (payCancelErr) {}
    }

    // Reverse any pending assistant earnings
    await reverseAssistantEarning(supabase, booking.id, `Admin cancelled booking: ${reason}`);

    const formatted = formatBooking(updatedBooking, { includeOTP: false });
    broadcast(bookingId, formatted);

    const { getIO } = require('./serviceController');
    const io = getIO();
    if (io) {
      io.emit('booking_cancelled', formatted);
      io.emit('status_update', formatted);
    }

    try {
      await logAdminAction({
        req,
        action: 'booking_cancelled_by_admin',
        resource_type: 'booking',
        resource_id: booking.id,
        result: 'success',
        metadata: {
          before: {
            booking_status: booking.booking_status,
            payment_status: booking.payment_status
          },
          after: {
            booking_status: 'cancelled',
            payment_status: newPaymentStatus
          },
          reason,
          refund: refundResult?.refund || null
        }
      });
    } catch (auditErr) {
      // Transaction Coupling: Rollback booking cancellation in PostgreSQL
      await supabase
        .from('bookings')
        .update({
          booking_status: booking.booking_status,
          payment_status: booking.payment_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      console.error('[CRITICAL AUDIT ROLLBACK] Booking cancellation rolled back due to audit failure:', auditErr.message);
      return res.status(500).json({
        message: 'Security Policy Enforcement: Audit logging failed for high-risk booking cancellation. Action was rolled back.'
      });
    }

    return res.json({
      success: true,
      message: refundResult?.success
        ? `Booking cancelled by admin. Refund of ₹${refundEligibility.refundAmount} processed.`
        : 'Booking cancelled by admin.',
      booking: formatted,
      refund: refundResult?.refund || null
    });

  } catch (err) {
    console.error('ADMIN CANCEL BOOKING ERROR:', err);
    return res.status(500).json({ message: 'Failed to cancel booking.' });
  }
};

// --------------------------------------------------
// GET CURRENT ADMIN PROFILE & PERMISSIONS (GET /admin/me)
// --------------------------------------------------
exports.getAdminProfile = async (req, res) => {
  try {
    const { resolveAdminRole } = require('../middleware/adminMiddleware');
    const { getPermissionsForRole } = require('../config/rbac');

    const adminRole = await resolveAdminRole(req.user.id);
    const permissions = getPermissionsForRole(adminRole);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, station_code, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: 'Admin account not found.' });
    }

    return res.json({
      ...user,
      admin_role: adminRole,
      permissions
    });
  } catch (err) {
    console.error('GET ADMIN PROFILE ERROR:', err);
    return res.status(500).json({ message: 'Failed to retrieve admin profile.' });
  }
};

// --------------------------------------------------
// ASSIGN ADMIN ROLE (POST /admin/users/:id/admin-role)
// Protected strictly by requirePermission('admins.manage') [SUPER_ADMIN ONLY]
// --------------------------------------------------
exports.setAdminRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_role } = req.body;
    const { normalizeAdminRole, getPermissionsForRole } = require('../config/rbac');

    const normalized = normalizeAdminRole(admin_role);
    if (!normalized) {
      return res.status(400).json({
        message: 'Invalid admin_role. Must be one of: super_admin, operations_admin, assistant_admin, finance_admin, safety_admin, support_admin, auditor.'
      });
    }

    if (req.user?.id === id) {
      return res.status(400).json({
        message: 'Super administrators cannot modify their own role.'
      });
    }

    // Verify target user is an existing admin
    const { data: targetUser, error: fetchErr } = await supabase
      .from('users')
      .select('id, name, email, role, kyc_documents')
      .eq('id', id)
      .single();

    if (fetchErr || !targetUser) {
      return res.status(404).json({ message: 'Target user not found.' });
    }

    if (targetUser.role !== 'admin') {
      return res.status(400).json({
        message: 'Admin sub-roles can only be assigned to accounts with base role "admin".'
      });
    }

    const { isApprovedAdminEmail } = require('../config/adminAllowlist');
    if (!isApprovedAdminEmail(targetUser.email)) {
      return res.status(403).json({
        message: 'Administrator roles can only be granted to approved administrator identities.'
      });
    }

    const curKyc = typeof targetUser.kyc_documents === 'object' && targetUser.kyc_documents !== null
      ? targetUser.kyc_documents
      : {};

    // Update with dual-write fallback for unmigrated database support
    let updateResult = await supabase
      .from('users')
      .update({
        admin_role: normalized,
        kyc_documents: { ...curKyc, admin_role: normalized }
      })
      .eq('id', id)
      .select('id, name, email, role')
      .single();

    if (updateResult.error && updateResult.error.message.includes('admin_role')) {
      // Fallback if column not yet added to users table
      updateResult = await supabase
        .from('users')
        .update({
          kyc_documents: { ...curKyc, admin_role: normalized }
        })
        .eq('id', id)
        .select('id, name, email, role')
        .single();
    }

    if (updateResult.error) {
      return res.status(400).json({ message: updateResult.error.message });
    }
    const { logAdminAction } = require('../services/adminAuditService');
    try {
      await logAdminAction({
        req,
        action: 'admin_role_updated',
        resource_type: 'user',
        resource_id: id,
        result: 'success',
        metadata: {
          before: {
            admin_role: targetUser.admin_role || targetUser.kyc_documents?.admin_role || 'none'
          },
          after: {
            admin_role: normalized
          },
          target_email: targetUser.email,
          target_name: targetUser.name
        }
      });
    } catch (auditErr) {
      // Transaction Coupling: Rollback role assignment in PostgreSQL
      const prevRole = targetUser.admin_role || null;
      await supabase
        .from('users')
        .update({
          admin_role: prevRole,
          kyc_documents: curKyc
        })
        .eq('id', id);

      console.error('[CRITICAL AUDIT ROLLBACK] Role update rolled back due to audit logging failure:', auditErr.message);
      return res.status(500).json({
        message: 'Security Policy Enforcement: Audit logging failed for high-risk action. Role assignment was rolled back.'
      });
    }

    // Phase 6.3: Invalidate all existing sessions for target user upon role alteration
    const sessionService = require('../services/sessionService');
    await sessionService.revokeAllUserSessions(id, 'role_changed', supabase);

    return res.json({
      success: true,
      message: `Admin role updated to '${normalized}' successfully. Target user active sessions revoked.`,
      user: {
        ...updateResult.data,
        admin_role: normalized,
        permissions: getPermissionsForRole(normalized)
      }
    });
  } catch (err) {
    console.error('SET ADMIN ROLE ERROR:', err);
    return res.status(500).json({ message: 'Failed to update admin role.' });
  }
};

// --------------------------------------------------
// AUDIT LOGS (GET /admin/audit-logs)
// Protected strictly by requirePermission('audit.view')
// --------------------------------------------------
exports.getAdminAuditLogs = async (req, res) => {
  try {
    const { getAdminAuditLogs } = require('../services/adminAuditService');
    const { action, actor_user_id, resource_type, resource_id, result, limit, offset } = req.query;
    const client = req.supabase || supabase;
    const response = await getAdminAuditLogs({
      filters: { action, actor_user_id, resource_type, resource_id, result },
      limit,
      offset,
      client
    });
    return res.json(response);
  } catch (err) {
    console.error('GET ADMIN AUDIT LOGS ERROR:', err);
    return res.status(500).json({ message: 'Failed to retrieve administrative audit logs.' });
  }
};

// --------------------------------------------------
// RECONCILE AUDIT LOGS (POST /admin/audit-logs/reconcile)
// Protected strictly by requirePermission('admins.manage') [SUPER_ADMIN ONLY]
// --------------------------------------------------
exports.reconcileAuditLogs = async (req, res) => {
  try {
    const { reconcileFallbackAuditLogs } = require('../services/adminAuditService');
    const client = req.supabase || supabase;
    const result = await reconcileFallbackAuditLogs({
      client,
      adminUser: req.user
    });
    return res.json(result);
  } catch (err) {
    console.error('RECONCILE AUDIT LOGS ERROR:', err);
    return res.status(500).json({ message: err.message || 'Failed to reconcile audit logs.' });
  }
};

// --------------------------------------------------
// SESSION MANAGEMENT (Phase 6.3)
// --------------------------------------------------

/**
 * GET /api/admin/sessions
 * List recent active sessions across the platform.
 * Protected by requirePermission('admins.manage')
 */
exports.getAllActiveSessions = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const client = req.supabase || supabase;
    const now = new Date().toISOString();

    const { data: sessions, error } = await client
      .from('user_sessions')
      .select('id, user_id, device_info, user_agent, ip_address, created_at, last_activity_at, expires_at, revoked_at, revocation_reason')
      .is('revoked_at', null)
      .gt('expires_at', now)
      .order('last_activity_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    // Mask IPs and sanitize
    const safe = (sessions || []).map(s => ({
      id: s.id,
      userId: s.user_id,
      deviceInfo: s.device_info || 'Unknown Device',
      userAgent: s.user_agent,
      ipAddress: s.ip_address ? s.ip_address.replace(/:\d+$/, '') : 'Hidden',
      createdAt: s.created_at,
      lastActivityAt: s.last_activity_at,
      expiresAt: s.expires_at,
      isActive: true,
      isCurrent: s.id === req.sessionId
    }));

    return res.json({ sessions: safe });
  } catch (err) {
    console.error('ADMIN GET ALL SESSIONS ERROR:', err);
    return res.status(500).json({ message: 'Failed to retrieve active sessions.' });
  }
};

/**
 * GET /api/admin/users/:id/sessions
 * List all sessions for a specific user.
 * Protected by requirePermission('passengers.manage') or 'admins.manage'
 */
exports.getUserSessionsAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionService = require('../services/sessionService');
    const sessions = await sessionService.getUserSessions(id, req.sessionId, req.supabase || supabase);
    return res.json({ sessions });
  } catch (err) {
    console.error('ADMIN GET USER SESSIONS ERROR:', err);
    return res.status(500).json({ message: 'Failed to retrieve user sessions.' });
  }
};

/**
 * POST /api/admin/sessions/:sessionId/revoke
 * Forcibly revoke a single session.
 * Protected by requirePermission('admins.manage')
 */
exports.revokeSessionAdmin = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionService = require('../services/sessionService');
    const success = await sessionService.revokeSession(sessionId, 'admin_forced', req.supabase || supabase);

    if (!success) {
      return res.status(404).json({ message: 'Session not found or already revoked.' });
    }

    try {
      await logAdminAction({
        req,
        action: 'admin_session_forced_revocation',
        resource_type: 'user_session',
        resource_id: sessionId,
        result: 'success',
        metadata: { revoked_by: req.user.id }
      });
    } catch (aErr) {}

    return res.json({ success: true, message: 'Session forcibly revoked by administrator.' });
  } catch (err) {
    console.error('ADMIN FORCED SESSION REVOKE ERROR:', err);
    return res.status(500).json({ message: 'Failed to revoke session.' });
  }
};

/**
 * POST /api/admin/users/:id/revoke-sessions
 * Forcibly revoke all active sessions for a target user.
 * Protected by requirePermission('admins.manage')
 */
exports.revokeAllUserSessionsAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionService = require('../services/sessionService');
    const count = await sessionService.revokeAllUserSessions(id, 'admin_forced', req.supabase || supabase);

    try {
      await logAdminAction({
        req,
        action: 'admin_session_forced_revocation',
        resource_type: 'user',
        resource_id: id,
        result: 'success',
        metadata: { revoked_by: req.user.id, count }
      });
    } catch (aErr) {}

    return res.json({ success: true, message: `Revoked ${count} active session(s) for user.` });
  } catch (err) {
    console.error('ADMIN FORCED USER SESSIONS REVOKE ERROR:', err);
    return res.status(500).json({ message: 'Failed to revoke user sessions.' });
  }
};