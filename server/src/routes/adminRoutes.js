const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { adminOnly, requirePermission } = require('../middleware/adminMiddleware');
const {
  getStats,
  getPendingAssistants,
  getAssistants,
  approveAssistant,
  rejectAssistant,
  getAllBookings,
  getBookingById,
  updateBooking,
  getUsers,
  updateUser,
  deleteUser,
  getSOSAlerts,
  resolveSOS,
  cancelBookingByAdmin,
  getAdminProfile,
  setAdminRole,
  getAdminAuditLogs,
  reconcileAuditLogs,
  getAllActiveSessions,
  getUserSessionsAdmin,
  revokeSessionAdmin,
  revokeAllUserSessionsAdmin
} = require('../controllers/adminController');

// All routes require authentication & admin role at the outer perimeter
router.use(protect, adminOnly);

// Authenticated Admin Profile & Permission Introspection
router.get('/me', getAdminProfile);

// Platform overview & stats
router.get('/stats', requirePermission('dashboard.view'), getStats);

// Session Management (Phase 6.3)
router.get('/sessions', requirePermission('admins.manage'), getAllActiveSessions);
router.get('/users/:id/sessions', requirePermission('passengers.view'), getUserSessionsAdmin);
router.post('/sessions/:sessionId/revoke', requirePermission('admins.manage'), revokeSessionAdmin);
router.post('/users/:id/revoke-sessions', requirePermission('admins.manage'), revokeAllUserSessionsAdmin);

// Bookings management
router.get('/bookings', requirePermission('bookings.view'), getAllBookings);
router.get('/bookings/:id', requirePermission('bookings.view'), getBookingById);
router.patch('/bookings/:id', requirePermission('bookings.manage'), updateBooking);
router.post('/bookings/:id/cancel', requirePermission('bookings.manage'), cancelBookingByAdmin);

// Assistant force & KYC
router.get('/pending-assistants', requirePermission('assistants.view'), getPendingAssistants);
router.get('/assistants', requirePermission('assistants.view'), getAssistants);
router.post('/assistants/:id/approve', requirePermission('assistants.approve'), approveAssistant);
router.post('/assistants/:id/reject', requirePermission('assistants.approve'), rejectAssistant);

// User / Passenger directory
router.get('/users', requirePermission('passengers.view'), getUsers);
router.patch('/users/:id', requirePermission('passengers.manage'), updateUser);
router.delete('/users/:id', requirePermission('passengers.manage'), deleteUser);

// Admin Sub-Role Assignment (SUPER_ADMIN Only)
router.post('/users/:id/admin-role', requirePermission('admins.manage'), setAdminRole);

// SOS emergency incident command
router.get('/sos-alerts', requirePermission('sos.view'), getSOSAlerts);
router.post('/sos-alerts/:id/resolve', requirePermission('sos.manage'), resolveSOS);

// Sahayak Payouts & Settlement Management (Phase 3B)
const {
  getAllPayouts,
  getAdminPayoutById,
  approvePayout,
  rejectPayout,
  markPayoutProcessing,
  markPayoutPaid,
  markPayoutFailed,
} = require('../controllers/payoutController');
const { adminPayoutLimiter } = require('../middleware/financialRateLimiter');

router.get('/payouts', requirePermission('payouts.view'), getAllPayouts);
router.get('/payouts/:id', requirePermission('payouts.view'), getAdminPayoutById);
router.post('/payouts/:id/approve', adminPayoutLimiter, requirePermission('payouts.approve'), approvePayout);
router.post('/payouts/:id/reject', adminPayoutLimiter, requirePermission('payouts.approve'), rejectPayout);
router.post('/payouts/:id/processing', adminPayoutLimiter, requirePermission('payouts.process'), markPayoutProcessing);
router.post('/payouts/:id/paid', adminPayoutLimiter, requirePermission('payouts.process'), markPayoutPaid);
router.post('/payouts/:id/failed', adminPayoutLimiter, requirePermission('payouts.process'), markPayoutFailed);

// Finance & Financial Reconciliation Management (Phases 4 & 5)
const {
  getReconciliationReport,
  getBookingReconciliation,
  getAuditLogs,
  getPayoutAudit,
  getFinancialHealth,
  getPaymentRecoveryList,
  getRefundMonitoringList,
  getPayoutMonitoringList,
  getProductionReadiness
} = require('../controllers/financeController');

router.get('/finance/reconciliation', requirePermission('finance.view'), getReconciliationReport);
router.get('/finance/reconciliation/bookings/:id', requirePermission('finance.view'), getBookingReconciliation);
router.get('/audit-logs', requirePermission('audit.view'), getAdminAuditLogs);
router.post('/audit-logs/reconcile', requirePermission('admins.manage'), reconcileAuditLogs);
router.get('/finance/audit-logs', requirePermission('audit.view'), getAuditLogs);
router.get('/finance/payouts/:id/audit', requirePermission('audit.view'), getPayoutAudit);
router.get('/finance/health', requirePermission('finance.view'), getFinancialHealth);
router.get('/finance/payment-recovery', requirePermission('finance.view'), getPaymentRecoveryList);
router.get('/finance/refund-monitoring', requirePermission('finance.view'), getRefundMonitoringList);
router.get('/finance/payout-monitoring', requirePermission('finance.view'), getPayoutMonitoringList);
router.get('/finance/production-readiness', requirePermission('finance.view'), getProductionReadiness);

// Financial Incident Management (Phase 5)
const {
  getIncidents,
  getIncidentStats,
  getIncidentById,
  investigateIncident,
  resolveIncident,
  ignoreIncident
} = require('../controllers/incidentController');

router.get('/incidents', requirePermission('incidents.view'), getIncidents);
router.get('/incidents/stats', requirePermission('incidents.view'), getIncidentStats);
router.get('/incidents/:id', requirePermission('incidents.view'), getIncidentById);
router.post('/incidents/:id/investigate', requirePermission('incidents.manage'), investigateIncident);
router.post('/incidents/:id/resolve', requirePermission('incidents.manage'), resolveIncident);
router.post('/incidents/:id/ignore', requirePermission('incidents.manage'), ignoreIncident);

// Live Production Validation, Canary Operations & Launch Certification (Phases 9 & 10)
const {
  getDeploymentStatus,
  createSession,
  listSessions,
  getSessionById,
  getSessionEvidenceList,
  createValidationOrder,
  validateLivePayment,
  validateWebhook,
  validateRecovery,
  validateRefund,
  validateWallet,
  getLaunchStatus,
  getCanaryStateEndpoint,
  enableCanaryHandler,
  pauseCanaryHandler,
  resumeCanaryHandler,
  advanceCanaryHandler,
  canaryInternalHandler,
  canaryLimitedHandler,
  canaryPercentageHandler,
  canaryPublicHandler,
  getCanaryMetricsHandler
} = require('../controllers/launchController');

// Production Deployment Validation (Phase 10)
router.get('/finance/deployment-status', requirePermission('finance.view'), getDeploymentStatus);

// Validation Sessions & Evidence
router.post('/finance/launch/sessions', requirePermission('finance.manage'), createSession);
router.get('/finance/launch/sessions', requirePermission('finance.view'), listSessions);
router.get('/finance/launch/sessions/:id', requirePermission('finance.view'), getSessionById);
router.get('/finance/launch/sessions/:id/evidence', requirePermission('finance.view'), getSessionEvidenceList);
router.post('/finance/launch/create-validation-order', requirePermission('finance.manage'), createValidationOrder);
router.post('/finance/launch/sessions/:id/validate-payment', requirePermission('finance.manage'), validateLivePayment);
router.post('/finance/launch/sessions/:id/validate-webhook', requirePermission('finance.manage'), validateWebhook);
router.post('/finance/launch/sessions/:id/validate-recovery', requirePermission('finance.manage'), validateRecovery);
router.post('/finance/launch/sessions/:id/validate-refund', requirePermission('finance.manage'), validateRefund);
router.post('/finance/launch/sessions/:id/validate-wallet', requirePermission('finance.manage'), validateWallet);

// Phase 10 REST Endpoints
router.get('/finance/live-validation', requirePermission('finance.view'), listSessions);
router.post('/finance/live-validation/session', requirePermission('finance.manage'), createSession);
router.post('/finance/live-validation/order', requirePermission('finance.manage'), createValidationOrder);
router.post('/finance/live-validation/verify-payment', requirePermission('finance.manage'), validateLivePayment);
router.get('/finance/live-validation/evidence', requirePermission('finance.view'), getSessionEvidenceList);

// Launch Certification Endpoints
router.get('/finance/launch/status', requirePermission('finance.view'), getLaunchStatus);
router.get('/finance/launch/certification', requirePermission('finance.view'), getLaunchStatus);
router.get('/finance/launch-certification', requirePermission('finance.view'), getLaunchStatus);
router.post('/finance/launch-certification/evaluate', requirePermission('finance.manage'), getLaunchStatus);

// Canary Rollout Endpoints
router.get('/finance/canary', requirePermission('finance.view'), getCanaryStateEndpoint);
router.post('/finance/launch/canary/enable', requirePermission('finance.manage'), enableCanaryHandler);
router.post('/finance/launch/canary/pause', requirePermission('finance.manage'), pauseCanaryHandler);
router.post('/finance/launch/canary/resume', requirePermission('finance.manage'), resumeCanaryHandler);
router.post('/finance/launch/canary/advance', requirePermission('finance.manage'), advanceCanaryHandler);
router.post('/finance/canary/internal', requirePermission('finance.manage'), canaryInternalHandler);
router.post('/finance/canary/limited', requirePermission('finance.manage'), canaryLimitedHandler);
router.post('/finance/canary/percentage', requirePermission('finance.manage'), canaryPercentageHandler);
router.post('/finance/canary/public', requirePermission('finance.manage'), canaryPublicHandler);
router.get('/finance/canary/metrics', requirePermission('finance.view'), getCanaryMetricsHandler);

// Station Desk & Operational Support Tickets
const {
  getAllTickets,
  getTicketById,
  updateTicketStatus,
  addMessageToTicket,
  createTicket
} = require('../controllers/supportController');

router.get('/support-tickets', requirePermission('support.view'), getAllTickets);
router.post('/support-tickets', requirePermission('support.manage'), createTicket);
router.get('/support-tickets/:id', requirePermission('support.view'), getTicketById);
router.patch('/support-tickets/:id', requirePermission('support.manage'), updateTicketStatus);
router.post('/support-tickets/:id/messages', requirePermission('support.manage'), addMessageToTicket);

module.exports = router;