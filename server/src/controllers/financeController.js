/**
 * server/src/controllers/financeController.js
 *
 * Finance & Financial Reconciliation Controller (Phase 4 & 5)
 *
 * Provides endpoints for Admin Finance Dashboard:
 *  - System-wide automated financial reconciliation
 *  - Per-booking financial reconciliation and invariant checks
 *  - Append-only financial audit log inspection and filtering
 *  - Payout audit trail resolution
 *  - System health diagnostics and stuck online payment recovery
 */

const defaultSupabase = require('../config/db');
const reconciliationService = require('../utils/reconciliationService');
const financialHealthService = require('../services/financialHealthService');
const fraudDetectionService = require('../services/fraudDetectionService');
const productionReadinessService = require('../services/productionReadinessService');

function getClient(req) {
  return req.supabase || defaultSupabase;
}

/**
 * GET /api/admin/finance/reconciliation
 * Runs automated reconciliation engine and returns system health and metrics.
 * Ingests any critical invariant issues into the incident management pipeline (Rule 5).
 */
exports.getReconciliationReport = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required.' });
    }

    const client = getClient(req);
    const report = await reconciliationService.runSystemReconciliation(client);

    // Rule 5: Automatically ingest critical reconciliation invariant issues into incidents
    if (report.issues && report.issues.length > 0) {
      await fraudDetectionService.ingestReconciliationIssues(client, report.issues);
    }

    res.json({
      success: true,
      report
    });
  } catch (err) {
    console.error('FINANCE RECONCILIATION ERROR:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to run financial reconciliation: ' + err.message
    });
  }
};

/**
 * GET /api/admin/finance/health
 * Production Readiness & Financial System Health Diagnostics (Phase 5).
 * Non-leaking diagnostic summary.
 */
exports.getFinancialHealth = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required.' });
    }

    const client = getClient(req);
    const health = await financialHealthService.runFinancialHealthCheck(client);
    res.json(health);
  } catch (err) {
    console.error('FINANCIAL HEALTH ERROR:', err);
    res.status(500).json({
      success: false,
      status: 'CRITICAL',
      message: 'Failed to run health check: ' + err.message
    });
  }
};

/**
 * GET /api/admin/finance/payment-recovery
 * Lists online payments stuck in 'pending' status older than threshold (15 minutes).
 * CRITICAL RULE: Admins cannot manually mark online payments as paid.
 */
exports.getPaymentRecoveryList = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required.' });
    }

    const client = getClient(req);
    const thresholdMinutes = parseInt(req.query?.thresholdMinutes, 10) || 15;
    const cutoffTime = new Date(Date.now() - thresholdMinutes * 60 * 1000).toISOString();

    const { data: stuckPayments, error } = await client
      .from('payments')
      .select('*, booking:booking_id(id, booking_id, train_number, journey_date, booking_status, passenger:passenger_id(id, name, email, phone))')
      .eq('status', 'pending')
      .neq('payment_method', 'cash')
      .lte('created_at', cutoffTime)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    const recoveryList = (stuckPayments || []).map((p) => {
      const ageMinutes = Math.round((Date.now() - new Date(p.created_at).getTime()) / 60000);
      return {
        payment_id: p.id,
        booking_id: p.booking_id,
        amount: p.amount,
        payment_status: p.status,
        payment_method: p.payment_method,
        razorpay_order_id: p.razorpay_order_id,
        created_at: p.created_at,
        age_minutes: ageMinutes,
        is_stuck: ageMinutes >= thresholdMinutes,
        recovery_action: 'Automated Gateway Polling / Webhook Telemetry Sync',
        policy_reminder: 'Option C: Online payments cannot be manually marked paid'
      };
    });

    res.json({
      success: true,
      count: recoveryList.length,
      threshold_minutes: thresholdMinutes,
      stuck_payments: recoveryList
    });
  } catch (err) {
    console.error('GET PAYMENT RECOVERY ERROR:', err);
    res.status(500).json({ message: 'Unable to retrieve payment recovery list.' });
  }
};

/**
 * GET /api/admin/finance/refund-monitoring
 * Detailed telemetry on pending, processed, and failed refunds.
 */
exports.getRefundMonitoringList = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required.' });
    }

    const client = getClient(req);
    const { data: allRefunds, error } = await client
      .from('refunds')
      .select('*, booking:booking_id(id, booking_id, booking_status, passenger:passenger_id(name, email, phone)), payment:payment_id(id, amount, payment_method)')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return res.json({ success: true, pending: [], processed: [], failed: [], high_value: [] });
      }
      return res.status(500).json({ message: error.message });
    }

    const refunds = allRefunds || [];
    const pending = refunds.filter((r) => r.status === 'pending' || r.status === 'requested');
    const processed = refunds.filter((r) => r.status === 'completed' || r.status === 'processed');
    const failed = refunds.filter((r) => r.status === 'failed');
    const highValue = refunds.filter((r) => Number(r.amount) >= 2000);

    res.json({
      success: true,
      stats: {
        total: refunds.length,
        pending_count: pending.length,
        processed_count: processed.length,
        failed_count: failed.length,
        high_value_count: highValue.length
      },
      pending,
      processed,
      failed,
      high_value: highValue
    });
  } catch (err) {
    console.error('GET REFUND MONITORING ERROR:', err);
    res.status(500).json({ message: 'Unable to retrieve refund monitoring data.' });
  }
};

/**
 * GET /api/admin/finance/payout-monitoring
 * Detailed telemetry on sahayak payouts, highlighting delayed reviews and failures.
 */
exports.getPayoutMonitoringList = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required.' });
    }

    const client = getClient(req);
    const { data: allPayouts, error } = await client
      .from('assistant_payouts')
      .select('*, assistant:assistant_id(id, name, email, phone, station_code), items:assistant_payout_items(*, earning:earning_id(*))')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    const payouts = allPayouts || [];
    const now = Date.now();

    // Delayed in requested > 24h
    const delayedRequested = payouts.filter((p) => {
      if (p.status !== 'requested') return false;
      const ageHours = (now - new Date(p.created_at).getTime()) / (1000 * 60 * 60);
      return ageHours >= 24;
    });

    // Delayed in processing > 48h
    const delayedProcessing = payouts.filter((p) => {
      if (p.status !== 'processing') return false;
      const ageHours = (now - new Date(p.updated_at || p.created_at).getTime()) / (1000 * 60 * 60);
      return ageHours >= 48;
    });

    const failed = payouts.filter((p) => p.status === 'failed');
    const highValue = payouts.filter((p) => Number(p.amount) >= 5000);

    res.json({
      success: true,
      stats: {
        total: payouts.length,
        delayed_requested_count: delayedRequested.length,
        delayed_processing_count: delayedProcessing.length,
        failed_count: failed.length,
        high_value_count: highValue.length
      },
      delayed_requested: delayedRequested,
      delayed_processing: delayedProcessing,
      failed,
      high_value: highValue
    });
  } catch (err) {
    console.error('GET PAYOUT MONITORING ERROR:', err);
    res.status(500).json({ message: 'Unable to retrieve payout monitoring data.' });
  }
};

/**
 * GET /api/admin/finance/reconciliation/bookings/:id
 * Reconciles a single booking and its payments, earnings, and refunds.
 */
exports.getBookingReconciliation = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required.' });
    }

    const client = getClient(req);
    const { id } = req.params;
    const result = await reconciliationService.reconcileBooking(client, id);
    if (!result.success) {
      return res.status(404).json({ success: false, message: result.error || 'Booking not found.' });
    }
    res.json(result);
  } catch (err) {
    console.error('BOOKING RECONCILIATION ERROR:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to reconcile booking: ' + err.message
    });
  }
};

/**
 * GET /api/admin/finance/audit-logs
 * Retrieves append-only financial audit trail records with optional filtering.
 */
exports.getAuditLogs = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required.' });
    }

    const client = getClient(req);
    const {
      action,
      actor_role,
      entity_type,
      booking_id,
      payout_id,
      payment_id,
      limit = 50,
      offset = 0
    } = req.query || {};

    let query = client
      .from('financial_audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (action && action !== 'ALL') {
      query = query.eq('action', action);
    }
    if (actor_role && actor_role !== 'ALL') {
      query = query.eq('actor_role', actor_role);
    }
    if (entity_type && entity_type !== 'ALL') {
      query = query.eq('entity_type', entity_type);
    }
    if (booking_id) {
      query = query.eq('booking_id', booking_id);
    }
    if (payout_id) {
      query = query.eq('payout_id', payout_id);
    }
    if (payment_id) {
      query = query.eq('payment_id', payment_id);
    }

    const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const pageOffset = Math.max(parseInt(offset, 10) || 0, 0);

    query = query.range(pageOffset, pageOffset + pageLimit - 1);

    const { data: logs, count, error } = await query;

    if (error) {
      if (error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
        return res.json({
          success: true,
          logs: [],
          total: 0,
          limit: pageLimit,
          offset: pageOffset,
          notice: 'financial_audit_logs table has not been initialized yet.'
        });
      }
      return res.status(500).json({ message: error.message });
    }

    res.json({
      success: true,
      logs: logs || [],
      total: count || (logs ? logs.length : 0),
      limit: pageLimit,
      offset: pageOffset
    });
  } catch (err) {
    console.error('GET AUDIT LOGS ERROR:', err);
    res.status(500).json({ message: 'Unable to retrieve financial audit logs.' });
  }
};

/**
 * GET /api/admin/finance/payouts/:id/audit
 * Retrieves all financial audit log records linked to a specific payout.
 */
exports.getPayoutAudit = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required.' });
    }

    const client = getClient(req);
    const { id } = req.params;

    const { data: logs, error } = await client
      .from('financial_audit_logs')
      .select('*')
      .or(`payout_id.eq.${id},and(entity_type.eq.assistant_payout,entity_id.eq.${id})`)
      .order('created_at', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return res.json({ success: true, audit_trail: [] });
      }
      return res.status(500).json({ message: error.message });
    }

    res.json({
      success: true,
      payout_id: id,
      audit_trail: logs || []
    });
  } catch (err) {
    console.error('GET PAYOUT AUDIT ERROR:', err);
    res.status(500).json({ message: 'Unable to load payout audit trail.' });
  }
};

/**
 * GET /api/admin/finance/production-readiness
 * Returns comprehensive Phase 6 production readiness and security posture report.
 */
exports.getProductionReadiness = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required.' });
    }

    const client = getClient(req);
    const report = await productionReadinessService.getProductionReadinessReport(client);

    res.json({
      success: true,
      ...report
    });
  } catch (err) {
    console.error('GET PRODUCTION READINESS ERROR:', err);
    res.status(500).json({ message: 'Unable to evaluate production readiness.' });
  }
};

/**
 * GET /api/admin/finance/online-payments
 * Genuine Razorpay online payments report with search, status/date filters, and CSV export.
 * Excludes cash collections strictly (Section 4.A).
 */
exports.getOnlinePayments = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required.' });
    }

    const client = getClient(req);
    const {
      search = '',
      status = 'ALL',
      startDate,
      endDate,
      page = 1,
      limit = 50,
      export: isExport = false
    } = req.query || {};

    let query = client
      .from('payments')
      .select(`
        id,
        booking_id,
        amount,
        currency,
        status,
        payment_method,
        gateway_order_id,
        gateway_payment_id,
        created_at,
        updated_at,
        booking:booking_id(
          id,
          booking_id,
          booking_status,
          total_price,
          station_code,
          passenger_id,
          assistant_id,
          passenger:passenger_id(id, name, email, phone),
          assistant:assistant_id(id, name, email, phone, station_code)
        )
      `, { count: 'exact' })
      .neq('payment_method', 'cash')
      .order('created_at', { ascending: false });

    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageLimit = isExport ? 1000 : Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const offset = (pageNum - 1) * pageLimit;

    if (!isExport) {
      query = query.range(offset, offset + pageLimit - 1);
    }

    const { data: rows = [], count = 0, error } = await query;
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    // Fetch refund mappings for these payments
    const paymentIds = (rows || []).map((r) => r.id);
    let refundsMap = new Map();
    if (paymentIds.length > 0) {
      try {
        const { data: refRows } = await client
          .from('refunds')
          .select('*')
          .in('payment_id', paymentIds);
        if (refRows) {
          refRows.forEach((rf) => {
            if (!refundsMap.has(rf.payment_id)) refundsMap.set(rf.payment_id, []);
            refundsMap.get(rf.payment_id).push(rf);
          });
        }
      } catch (rErr) {}
    }

    const payments = (rows || []).map((p) => {
      const pRefunds = refundsMap.get(p.id) || [];
      const totalRefunded = pRefunds
        .filter((r) => ['completed', 'processed'].includes(r.status))
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const latestRefund = pRefunds[0] || null;

      return {
        payment_id: p.id,
        gateway_payment_id: p.gateway_payment_id || 'N/A',
        gateway_order_id: p.gateway_order_id || 'N/A',
        booking_id: p.booking_id,
        booking_reference: p.booking?.booking_id || p.booking_id,
        amount: Number(p.amount) || 0,
        amount_paise: Math.round((Number(p.amount) || 0) * 100),
        currency: p.currency || 'INR',
        payment_method: p.payment_method || 'online',
        payment_status: p.status,
        created_at: p.created_at,
        updated_at: p.updated_at,
        passenger: p.booking?.passenger || null,
        assistant: p.booking?.assistant || null,
        station_code: p.booking?.station_code || 'N/A',
        refund_amount: totalRefunded,
        refund_status: latestRefund?.status || (p.status === 'refunded' ? 'processed' : 'none'),
        gateway_refund_id: latestRefund?.gateway_refund_id || latestRefund?.provider_refund_id || 'N/A',
        settlement_status: p.status === 'paid' ? 'settled_estimate' : 'pending'
      };
    });

    // Client-side search fallback if search parameter was passed
    let filtered = payments;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = payments.filter((p) =>
        String(p.booking_id || '').toLowerCase().includes(q) ||
        String(p.booking_reference || '').toLowerCase().includes(q) ||
        String(p.gateway_payment_id || '').toLowerCase().includes(q) ||
        String(p.gateway_order_id || '').toLowerCase().includes(q) ||
        String(p.passenger?.name || '').toLowerCase().includes(q) ||
        String(p.passenger?.phone || '').toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      data: filtered,
      total: count,
      page: pageNum,
      limit: pageLimit,
      is_export: isExport
    });
  } catch (err) {
    console.error('GET ONLINE PAYMENTS ERROR:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve online payments report.' });
  }
};

/**
 * GET /api/admin/finance/cash-collections
 * Offline Cash Collections report (Section 4.B).
 * Displays expected amount, confirmation timestamp, assistant, status, disputes, and audit trail.
 */
exports.getCashCollections = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required.' });
    }

    const client = getClient(req);
    const {
      search = '',
      status = 'ALL',
      assistantId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      export: isExport = false
    } = req.query || {};

    // First attempt querying dedicated cash_collections table
    let collections = [];
    let totalCount = 0;
    let queryError = null;

    try {
      let ccQuery = client
        .from('cash_collections')
        .select(`
          *,
          booking:booking_id(
            id,
            booking_id,
            booking_status,
            total_price,
            final_price,
            station_code,
            created_at,
            passenger:passenger_id(id, name, phone, email),
            assistant:assistant_id(id, name, phone, station_code)
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (status && status !== 'ALL') {
        ccQuery = ccQuery.eq('status', status);
      }
      if (assistantId) {
        ccQuery = ccQuery.eq('assistant_id', assistantId);
      }
      if (startDate) {
        ccQuery = ccQuery.gte('created_at', new Date(startDate).toISOString());
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        ccQuery = ccQuery.lte('created_at', end.toISOString());
      }

      const { data, count, error } = await ccQuery;
      if (!error && data) {
        collections = data.map((c) => ({
          id: c.id,
          booking_id: c.booking_id,
          booking_reference: c.booking?.booking_id || c.booking_id,
          booking_status: c.booking?.booking_status || 'unknown',
          expected_amount: Number(c.expected_amount) || 0,
          collected_amount: Number(c.collected_amount) || 0,
          status: c.status,
          passenger: c.booking?.passenger || null,
          assistant: c.booking?.assistant || null,
          station_code: c.booking?.station_code || 'N/A',
          collected_at: c.collected_at,
          confirmed_by_user_id: c.confirmed_by_user_id,
          confirmed_by_role: c.confirmed_by_role,
          dispute_reason: c.dispute_reason,
          reimbursement_reason: c.reimbursement_reason,
          audit_trail: c.audit_trail || [],
          created_at: c.created_at
        }));
        totalCount = count || collections.length;
      } else {
        queryError = error;
      }
    } catch (tblErr) {
      queryError = tblErr;
    }

    // Fallback: If cash_collections table was not populated or failed, read from bookings where payment_method = 'cash'
    if (collections.length === 0) {
      let bQuery = client
        .from('bookings')
        .select(`
          id,
          booking_id,
          booking_status,
          total_price,
          final_price,
          station_code,
          collection_status,
          cash_collected_at,
          cash_confirmed_by,
          services,
          created_at,
          passenger:passenger_id(id, name, phone, email),
          assistant:assistant_id(id, name, phone, station_code)
        `)
        .eq('payment_method', 'cash')
        .order('created_at', { ascending: false });

      if (assistantId) {
        bQuery = bQuery.eq('assistant_id', assistantId);
      }

      const { data: bData } = await bQuery;
      if (bData) {
        collections = bData.map((b) => {
          const cashServiceState = b.services?.cash_collection || {};
          const collStatus = b.collection_status || cashServiceState.status || (b.booking_status === 'completed' ? 'collected' : 'awaiting_collection');
          return {
            id: `virtual-${b.id}`,
            booking_id: b.id,
            booking_reference: b.booking_id || b.id,
            booking_status: b.booking_status,
            expected_amount: Number(b.final_price || b.total_price) || 0,
            collected_amount: collStatus === 'collected' ? (Number(b.final_price || b.total_price) || 0) : 0,
            status: collStatus,
            passenger: b.passenger,
            assistant: b.assistant,
            station_code: b.station_code || 'N/A',
            collected_at: b.cash_collected_at || cashServiceState.collected_at || (collStatus === 'collected' ? b.created_at : null),
            confirmed_by_user_id: b.cash_confirmed_by || cashServiceState.confirmed_by_user_id || 'assistant',
            confirmed_by_role: cashServiceState.confirmed_by_role || 'assistant',
            dispute_reason: cashServiceState.dispute_reason || null,
            reimbursement_reason: cashServiceState.reimbursement_reason || null,
            audit_trail: cashServiceState.audit_trail || [],
            created_at: b.created_at
          };
        });

        if (status && status !== 'ALL') {
          collections = collections.filter((c) => c.status === status);
        }
        totalCount = collections.length;
      }
    }

    // Apply search filter
    let filtered = collections;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = collections.filter((c) =>
        String(c.booking_id || '').toLowerCase().includes(q) ||
        String(c.booking_reference || '').toLowerCase().includes(q) ||
        String(c.passenger?.name || '').toLowerCase().includes(q) ||
        String(c.passenger?.phone || '').toLowerCase().includes(q) ||
        String(c.assistant?.name || '').toLowerCase().includes(q)
      );
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageLimit = isExport ? 1000 : Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const paginated = isExport ? filtered : filtered.slice((pageNum - 1) * pageLimit, pageNum * pageLimit);

    res.json({
      success: true,
      data: paginated,
      total: filtered.length,
      page: pageNum,
      limit: pageLimit,
      is_export: isExport
    });
  } catch (err) {
    console.error('GET CASH COLLECTIONS ERROR:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve cash collections report.' });
  }
};

/**
 * POST /api/admin/finance/cash-collections/:bookingId/confirm
 * Authorized admin confirmation of cash collection.
 */
exports.confirmCashCollectionAdmin = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required.' });
    }

    const client = getClient(req);
    const { bookingId } = req.params;
    const { amount, notes } = req.body || {};

    const cashService = require('../utils/cashCollectionService');
    const result = await cashService.confirmCashCollection(client, bookingId, {
      amount,
      confirmedByUserId: req.user?.id || 'admin',
      confirmedByRole: 'admin',
      notes: notes || 'Admin confirmed offline cash collection'
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Cash collection confirmed by admin.',
      collection: result.collection
    });
  } catch (err) {
    console.error('CONFIRM CASH COLLECTION ADMIN ERROR:', err);
    res.status(500).json({ success: false, message: 'Failed to confirm cash collection.' });
  }
};

/**
 * POST /api/admin/finance/cash-collections/:bookingId/dispute
 * Flag a cash collection as disputed.
 */
exports.disputeCashCollectionAdmin = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required.' });
    }

    const client = getClient(req);
    const { bookingId } = req.params;
    const { reason = 'Disputed by admin' } = req.body || {};

    const cashService = require('../utils/cashCollectionService');
    const result = await cashService.disputeCashCollection(client, bookingId, {
      reason,
      disputedByUserId: req.user?.id || 'admin',
      disputedByRole: 'admin'
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Cash collection flagged as disputed.',
      collection: result.collection
    });
  } catch (err) {
    console.error('DISPUTE CASH COLLECTION ADMIN ERROR:', err);
    res.status(500).json({ success: false, message: 'Failed to record dispute.' });
  }
};

/**
 * POST /api/admin/finance/cash-collections/:bookingId/reimburse
 * Authorized cash reimbursement (for cancelled cash bookings where cash was collected).
 */
exports.reimburseCashAdmin = async (req, res) => {
  try {
    if (req.user && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin privilege required.' });
    }

    const client = getClient(req);
    const { bookingId } = req.params;
    const { notes = 'Cash reimbursed to passenger', amount } = req.body || {};

    const cashService = require('../utils/cashCollectionService');
    const result = await cashService.confirmCashReimbursement(client, bookingId, {
      reimbursedByUserId: req.user?.id || 'admin',
      notes,
      amount
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: 'Cash reimbursement confirmed and recorded.',
      collection: result.collection
    });
  } catch (err) {
    console.error('REIMBURSE CASH ADMIN ERROR:', err);
    res.status(500).json({ success: false, message: 'Failed to process cash reimbursement.' });
  }
};

