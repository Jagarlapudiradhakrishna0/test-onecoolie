/**
 * server/src/services/securityResponseService.js
 *
 * ONECOOLIE Phase 6.7: Centralized Automated Incident Response Engine
 *
 * Executes containment and remediation actions in response to detected security incidents.
 *
 * CRITICAL ARCHITECTURE RULE:
 * This service NEVER duplicates direct database revocation or socket disconnection logic.
 * It strictly orchestrates existing authoritative services:
 * - sessionService.revokeFamily()
 * - sessionService.revokeSession()
 * - sessionService.revokeAllUserSessions()
 * - socketSessionService.disconnectFamilySessions()
 * - socketSessionService.disconnectSession()
 * - socketSessionService.disconnectUserSessions()
 * - adminAuditService.logAdminAction()
 */

const sessionService = require('./sessionService');
const socketSessionService = require('./socketSessionService');
const defaultSupabase = require('../config/db');
const { logger } = require('../utils/logger');
const { logAdminAction } = require('./adminAuditService');

/**
 * Records a response action in public.security_response_actions.
 *
 * @param {object} params
 * @param {string} [params.incidentId]
 * @param {string} params.actionType
 * @param {'system' | 'admin'} params.initiatedBy
 * @param {string} [params.initiatedByUserId]
 * @param {string} params.result - 'success' | 'failure'
 * @param {object} [params.metadata]
 * @param {object} [params.client]
 * @returns {Promise<object>}
 */
async function recordResponseAction({
  incidentId = null,
  actionType,
  initiatedBy = 'system',
  initiatedByUserId = null,
  result = 'success',
  metadata = {},
  client = defaultSupabase
}) {
  const record = {
    id: crypto.randomUUID ? crypto.randomUUID() : undefined,
    incident_id: incidentId,
    action_type: actionType,
    initiated_by: initiatedBy,
    initiated_by_user_id: initiatedByUserId,
    result,
    metadata,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await client
      .from('security_response_actions')
      .insert([record])
      .select()
      .maybeSingle();

    if (error) {
      logger.warn('[SECURITY_RESPONSE] Failed to persist response action record:', error.message);
    }
    return data || record;
  } catch (err) {
    logger.warn('[SECURITY_RESPONSE] Error writing response action:', err.message);
    return record;
  }
}

/**
 * Executes automated containment for an incident.
 *
 * @param {object} incident - The incident to contain
 * @param {object} [client]
 * @returns {Promise<{ action: string, success: boolean }>}
 */
async function executeAutomatedResponse(incident, client = defaultSupabase) {
  if (!incident || !incident.incident_type) {
    return { action: 'none', success: false };
  }

  const { incident_type, family_id, session_id, user_id, id: incidentId } = incident;
  let actionTaken = 'none';
  let success = true;

  try {
    switch (incident_type) {
      case 'refresh_token_reuse_detected': {
        actionTaken = 'revoke_family';
        if (family_id) {
          logger.warn(`[SECURITY_RESPONSE] Revoking family ${family_id} due to token reuse detection`);
          await sessionService.revokeFamily(family_id, 'rotation_reuse_detected', client);
          socketSessionService.disconnectFamilySessions(family_id, 'rotation_reuse_detected');
        } else if (session_id) {
          await sessionService.revokeSession(session_id, 'rotation_reuse_detected', client);
          socketSessionService.disconnectSession(session_id, 'rotation_reuse_detected');
        }
        break;
      }

      case 'repeated_mfa_failures': {
        actionTaken = 'mfa_lockout_warning';
        // Account lockout counter on public.users is already handled authoritatively by authController.
        // Record telemetry alert here.
        logger.warn(`[SECURITY_RESPONSE] Flagged repeated MFA failures for user ${user_id}`);
        break;
      }

      case 'suspicious_session_activity': {
        actionTaken = 'revoke_session';
        if (session_id) {
          await sessionService.revokeSession(session_id, 'suspicious_activity', client);
          socketSessionService.disconnectSession(session_id, 'suspicious_activity');
        }
        break;
      }

      case 'repeated_login_failures': {
        actionTaken = 'login_failure_alert';
        logger.warn(`[SECURITY_RESPONSE] High login failure velocity flagged for IP/User: ${user_id || incident.source_ip}`);
        break;
      }

      default: {
        actionTaken = 'logged_and_monitored';
        break;
      }
    }

    // Persist containment action record
    await recordResponseAction({
      incidentId,
      actionType: actionTaken,
      initiatedBy: 'system',
      result: success ? 'success' : 'failure',
      metadata: { incident_type, family_id, session_id, user_id },
      client
    });

  } catch (err) {
    logger.error('[SECURITY_RESPONSE] Automated response execution error:', err);
    success = false;
    await recordResponseAction({
      incidentId,
      actionType: actionTaken,
      initiatedBy: 'system',
      result: 'failure',
      metadata: { error: err.message },
      client
    });
  }

  return { action: actionTaken, success };
}

/**
 * Executes an explicit administrator containment action on an incident.
 *
 * @param {object} params
 * @param {string} params.incidentId
 * @param {'revoke_session' | 'revoke_user_sessions' | 'revoke_family' | 'require_reauthentication'} params.action
 * @param {object} params.adminUser - Authenticated admin triggering containment
 * @param {object} [params.req] - Express request for audit logging
 * @param {object} [params.client]
 * @returns {Promise<{ success: boolean, action: string, details: string }>}
 */
async function executeAdminManualResponse({
  incidentId,
  action,
  adminUser,
  req = null,
  client = defaultSupabase
}) {
  if (!incidentId || !action || !adminUser) {
    throw new Error('incidentId, action, and adminUser required for manual response');
  }

  // Look up incident
  const { data: incident, error: incErr } = await client
    .from('security_incidents')
    .select('*')
    .eq('id', incidentId)
    .maybeSingle();

  if (incErr || !incident) {
    throw new Error('Target incident not found');
  }

  let details = '';
  let success = true;

  try {
    switch (action) {
      case 'revoke_session': {
        if (!incident.session_id) {
          throw new Error('Incident has no associated sessionId to revoke');
        }
        await sessionService.revokeSession(incident.session_id, 'admin_forced', client);
        socketSessionService.disconnectSession(incident.session_id, 'admin_forced');
        details = `Revoked session ${incident.session_id}`;
        break;
      }

      case 'revoke_user_sessions': {
        if (!incident.user_id) {
          throw new Error('Incident has no associated userId to revoke');
        }
        const count = await sessionService.revokeAllUserSessions(incident.user_id, 'admin_forced', client);
        socketSessionService.disconnectUserSessions(incident.user_id, 'admin_forced');
        details = `Revoked ${count} active session(s) for user ${incident.user_id}`;
        break;
      }

      case 'revoke_family': {
        if (!incident.family_id) {
          throw new Error('Incident has no associated familyId to revoke');
        }
        const count = await sessionService.revokeFamily(incident.family_id, 'admin_forced', client);
        socketSessionService.disconnectFamilySessions(incident.family_id, 'admin_forced');
        details = `Revoked token family ${incident.family_id} (${count} sessions)`;
        break;
      }

      case 'require_reauthentication': {
        if (incident.session_id) {
          await sessionService.revokeSession(incident.session_id, 'admin_forced', client);
          socketSessionService.disconnectSession(incident.session_id, 'admin_forced');
        } else if (incident.user_id) {
          await sessionService.revokeAllUserSessions(incident.user_id, 'admin_forced', client);
          socketSessionService.disconnectUserSessions(incident.user_id, 'admin_forced');
        }
        details = `Forced re-authentication for subject`;
        break;
      }

      default:
        throw new Error(`Unsupported response action: ${action}`);
    }

    // Update incident status to contained
    await client
      .from('security_incidents')
      .update({
        status: 'contained',
        containment_action: action,
        assigned_admin_id: adminUser.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', incidentId);

    // Record response action in security audit
    await recordResponseAction({
      incidentId,
      actionType: action,
      initiatedBy: 'admin',
      initiatedByUserId: adminUser.id,
      result: 'success',
      metadata: { details, adminEmail: adminUser.email },
      client
    });

    // Record immutable audit log
    if (req) {
      await logAdminAction({
        req,
        action: 'security_incident_manual_containment',
        resource_type: 'security_incident',
        resource_id: incidentId,
        result: 'success',
        metadata: { action, details, incidentType: incident.incident_type, targetUser: incident.user_id }
      });
    }

  } catch (err) {
    logger.error('[SECURITY_RESPONSE] Manual containment action failed:', err);
    success = false;
    details = err.message;

    await recordResponseAction({
      incidentId,
      actionType: action,
      initiatedBy: 'admin',
      initiatedByUserId: adminUser.id,
      result: 'failure',
      metadata: { error: err.message },
      client
    });
    throw err;
  }

  return { success, action, details };
}

module.exports = {
  recordResponseAction,
  executeAutomatedResponse,
  executeAdminManualResponse
};
