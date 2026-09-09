/**
 * server/src/middleware/securityIncidentGuard.js
 *
 * ONECOOLIE Phase 6.7: Security Incident Guard Middleware
 *
 * Provides fail-safe, targeted protection for accounts or sessions currently flagged
 * under critical active investigation or containment.
 *
 * Blocks high-risk operations (password changes, payment payout requests, administrative changes)
 * while ensuring standard recovery mechanisms remain safely accessible.
 */

const { isSessionUnderContainment, isUserUnderContainment } = require('../services/securityIncidentService');
const { logger } = require('../utils/logger');

/**
 * Middleware preventing high-risk state mutations if the active session or account is under active containment.
 */
async function securityIncidentGuard(req, res, next) {
  try {
    const sessionId = req.user?.sid || req.userSession?.id;
    const userId = req.user?.id || req.userSession?.user_id;

    if (sessionId && isSessionUnderContainment(sessionId)) {
      logger.warn('[INCIDENT_GUARD] Blocked request from session under containment', {
        sessionId,
        userId,
        path: req.originalUrl,
        requestId: req.requestId
      });
      return res.status(403).json({
        success: false,
        code: 'SESSION_UNDER_CONTAINMENT',
        message: 'This session is restricted due to a security incident under investigation. Please re-authenticate.',
        requestId: req.requestId
      });
    }

    if (userId && isUserUnderContainment(userId)) {
      logger.warn('[INCIDENT_GUARD] Blocked request for user under containment', {
        userId,
        path: req.originalUrl,
        requestId: req.requestId
      });
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_UNDER_CONTAINMENT',
        message: 'Account operations temporarily restricted for security protection. Contact administrator support.',
        requestId: req.requestId
      });
    }

    next();
  } catch (err) {
    // Fail-safe: do not halt traffic if guard lookup encounters transient error
    logger.error('[INCIDENT_GUARD] Error during guard check:', err);
    next();
  }
}

module.exports = {
  securityIncidentGuard
};
