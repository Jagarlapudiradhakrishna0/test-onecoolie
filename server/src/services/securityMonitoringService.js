/**
 * server/src/services/securityMonitoringService.js
 *
 * ONECOOLIE Phase 6.7: Centralized Security Event Monitoring & Correlation Engine
 *
 * Ingests normalized security events across authentication, sessions, Socket.IO,
 * CSRF, CORS, and administrative operations.
 *
 * Evaluates sliding-window attack pattern rules:
 * - Rule 1: Refresh Token Reuse -> Immediate Critical Incident
 * - Rule 2: 5 Failed Logins within 10 min -> Medium Suspicious Authentication Incident
 * - Rule 3: 5 Failed MFA Attempts within 10 min -> High Incident & Lockout Alert
 * - Rule 4: 3 CSRF Validation Failures within 5 min -> Medium Suspicious Request Incident
 * - Rule 5: Repeated Rate Limit Violations -> Severity Escalation (Low -> Medium -> High)
 */

const crypto = require('crypto');
const defaultSupabase = require('../config/db');
const { logger } = require('../utils/logger');
const { createOrUpdateIncident } = require('./securityIncidentService');
const { maskIp } = require('../middleware/securityTelemetry');

const VALID_EVENT_TYPES = new Set([
  'login_success',
  'login_failed',
  'otp_failed',
  'mfa_failed',
  'mfa_success',
  'account_locked',
  'account_unlocked',
  'refresh_success',
  'refresh_failed',
  'refresh_token_reuse_detected',
  'session_created',
  'session_revoked',
  'session_revoked_admin',
  'logout',
  'logout_all',
  'password_changed',
  'password_reset',
  'role_changed',
  'csrf_validation_failed',
  'origin_validation_failed',
  'cors_rejected',
  'rate_limit_exceeded',
  'suspicious_request',
  'socket_auth_failed',
  'socket_session_revoked',
  'admin_security_action',
  'admin_allowlist_denied',
  'admin_access_allowed',
  'incident_created',
  'incident_resolved'
]);

const VALID_SEVERITIES = new Set(['info', 'low', 'medium', 'high', 'critical']);

// In-memory sliding-window trackers for event pattern correlation
// key -> Array<{ timestamp: number }>
const slidingWindows = {
  loginFailures: new Map(), // key = userId or ip
  mfaFailures: new Map(),   // key = userId
  csrfFailures: new Map(),  // key = ip
  rateLimitHits: new Map()  // key = ip
};

/**
 * Cleans expired entries from sliding window maps.
 */
function purgeExpiredEntries(map, maxAgeMs) {
  const cutoff = Date.now() - maxAgeMs;
  for (const [key, timestamps] of map.entries()) {
    const valid = timestamps.filter(t => t > cutoff);
    if (valid.length === 0) {
      map.delete(key);
    } else {
      map.set(key, valid);
    }
  }
}

// Periodically clean sliding window maps (every 5 minutes)
setInterval(() => {
  purgeExpiredEntries(slidingWindows.loginFailures, 15 * 60 * 1000);
  purgeExpiredEntries(slidingWindows.mfaFailures, 15 * 60 * 1000);
  purgeExpiredEntries(slidingWindows.csrfFailures, 10 * 60 * 1000);
  purgeExpiredEntries(slidingWindows.rateLimitHits, 15 * 60 * 1000);
}, 5 * 60 * 1000).unref();

/**
 * Normalizes and records a security event, evaluating threat detection rules.
 *
 * @param {object} params
 * @param {string} params.eventType
 * @param {'info' | 'low' | 'medium' | 'high' | 'critical'} [params.severity='info']
 * @param {string} [params.userId]
 * @param {string} [params.sessionId]
 * @param {string} [params.familyId]
 * @param {string} [params.ip]
 * @param {string} [params.userAgent]
 * @param {string} [params.requestId]
 * @param {object} [params.metadata]
 * @param {object} [params.client]
 * @returns {Promise<object>} Recorded event
 */
async function recordSecurityEvent({
  eventType,
  severity = 'info',
  userId = null,
  sessionId = null,
  familyId = null,
  ip = null,
  userAgent = null,
  requestId = null,
  metadata = {},
  client = defaultSupabase
}) {
  if (!VALID_EVENT_TYPES.has(eventType)) {
    logger.warn(`[SECURITY_MONITORING] Invalid event type: ${eventType}`);
    eventType = 'suspicious_request';
  }

  if (!VALID_SEVERITIES.has(severity)) {
    severity = 'info';
  }

  const maskedSourceIp = ip ? maskIp(ip) : null;
  const nowIso = new Date().toISOString();

  // Sanitize metadata to guarantee ZERO token/password leakage
  const safeMetadata = { ...metadata };
  delete safeMetadata.token;
  delete safeMetadata.accessToken;
  delete safeMetadata.refreshToken;
  delete safeMetadata.password;
  delete safeMetadata.recoveryCode;
  delete safeMetadata.otp;
  delete safeMetadata.mfaSecret;

  const eventRecord = {
    id: crypto.randomUUID ? crypto.randomUUID() : undefined,
    event_type: eventType,
    severity,
    user_id: userId,
    session_id: sessionId,
    family_id: familyId,
    request_id: requestId,
    source_ip: maskedSourceIp,
    user_agent: userAgent ? userAgent.slice(0, 300) : null,
    metadata: safeMetadata,
    created_at: nowIso
  };

  // 1. Asynchronously persist event to database (fail-safe)
  try {
    const { data, error } = await client
      .from('security_events')
      .insert([eventRecord])
      .select()
      .maybeSingle();

    if (error) {
      logger.warn('[SECURITY_MONITORING] DB insert failed for security_event:', error.message);
    } else if (data) {
      eventRecord.id = data.id;
    }
  } catch (dbErr) {
    logger.warn('[SECURITY_MONITORING] Database error saving event:', dbErr.message);
  }

  // 2. Structured Log
  if (severity === 'critical' || severity === 'high') {
    logger.error(`[SECURITY_ALERT] ${eventType.toUpperCase()}`, eventRecord);
  } else if (severity === 'medium') {
    logger.warn(`[SECURITY_EVENT] ${eventType}`, eventRecord);
  }

  // 3. Evaluate Pattern Detection Rules
  try {
    await evaluateThreatRules(eventRecord, client);
  } catch (ruleErr) {
    logger.error('[SECURITY_MONITORING] Error in threat rule evaluation:', ruleErr);
  }

  return eventRecord;
}

/**
 * Evaluates real-time attack pattern rules based on sliding windows.
 */
async function evaluateThreatRules(event, client) {
  const now = Date.now();
  const { event_type, user_id, family_id, session_id, source_ip, id: eventId } = event;

  // RULE 1: Refresh Token Reuse Detected -> Critical Incident
  if (event_type === 'refresh_token_reuse_detected') {
    await createOrUpdateIncident({
      incidentType: 'refresh_token_reuse_detected',
      severity: 'critical',
      userId: user_id,
      sessionId: session_id,
      familyId: family_id,
      sourceIp: source_ip,
      eventId,
      metadata: { reason: 'Attacker submitted previously rotated refresh token hash' },
      client
    });
    return;
  }

  // RULE 2: Repeated Login Failures (5 failures within 10 minutes)
  if (event_type === 'login_failed') {
    const trackerKey = user_id || source_ip || 'unknown';
    const list = slidingWindows.loginFailures.get(trackerKey) || [];
    list.push(now);
    slidingWindows.loginFailures.set(trackerKey, list);

    const windowFailures = list.filter(t => t > now - 10 * 60 * 1000);
    if (windowFailures.length >= 5) {
      await createOrUpdateIncident({
        incidentType: 'repeated_login_failures',
        severity: 'medium',
        userId: user_id,
        sourceIp: source_ip,
        eventId,
        metadata: { failureCount: windowFailures.length, timeWindow: '10m' },
        client
      });
    }
  }

  // RULE 3: Repeated MFA Failures (5 failures within 10 minutes)
  if (event_type === 'mfa_failed') {
    const trackerKey = user_id || 'unknown';
    const list = slidingWindows.mfaFailures.get(trackerKey) || [];
    list.push(now);
    slidingWindows.mfaFailures.set(trackerKey, list);

    const windowMfaFailures = list.filter(t => t > now - 10 * 60 * 1000);
    if (windowMfaFailures.length >= 5) {
      await createOrUpdateIncident({
        incidentType: 'repeated_mfa_failures',
        severity: 'high',
        userId: user_id,
        sourceIp: source_ip,
        eventId,
        metadata: { failureCount: windowMfaFailures.length, timeWindow: '10m' },
        client
      });
    }
  }

  // RULE 4: CSRF Validation Failures (3 failures within 5 minutes)
  if (event_type === 'csrf_validation_failed' || event_type === 'origin_validation_failed') {
    const trackerKey = source_ip || 'unknown';
    const list = slidingWindows.csrfFailures.get(trackerKey) || [];
    list.push(now);
    slidingWindows.csrfFailures.set(trackerKey, list);

    const windowCsrf = list.filter(t => t > now - 5 * 60 * 1000);
    if (windowCsrf.length >= 3) {
      await createOrUpdateIncident({
        incidentType: 'csrf_attack_pattern',
        severity: 'medium',
        sourceIp: source_ip,
        eventId,
        metadata: { violationCount: windowCsrf.length, timeWindow: '5m' },
        client
      });
    }
  }

  // RULE 5: Rate Limit Exceeded Pattern
  if (event_type === 'rate_limit_exceeded') {
    const trackerKey = source_ip || user_id || 'unknown';
    const list = slidingWindows.rateLimitHits.get(trackerKey) || [];
    list.push(now);
    slidingWindows.rateLimitHits.set(trackerKey, list);

    const windowHits = list.filter(t => t > now - 10 * 60 * 1000);
    if (windowHits.length >= 10) {
      await createOrUpdateIncident({
        incidentType: 'excessive_rate_limit_violations',
        severity: windowHits.length >= 25 ? 'high' : 'medium',
        userId: user_id,
        sourceIp: source_ip,
        eventId,
        metadata: { violationCount: windowHits.length, timeWindow: '10m' },
        client
      });
    }
  }
}

/**
 * Returns safe security activity events for the authenticated user.
 *
 * @param {string} userId
 * @param {object} [client]
 * @returns {Promise<Array>}
 */
async function getUserRecentEvents(userId, client = defaultSupabase) {
  if (!userId) return [];

  const { data, error } = await client
    .from('security_events')
    .select('id, event_type, severity, created_at, source_ip')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(15);

  if (error || !data) return [];

  // Map into human-readable user labels
  const userEventMap = {
    login_success: 'Successful Sign-in',
    login_failed: 'Failed Sign-in Attempt',
    logout: 'Signed Out',
    logout_all: 'Signed Out from All Devices',
    password_changed: 'Password Changed',
    password_reset: 'Password Reset',
    session_created: 'New Session Created',
    session_revoked: 'Session Revoked',
    account_locked: 'Account Temporarily Locked'
  };

  return data.map(evt => ({
    id: evt.id,
    label: userEventMap[evt.event_type] || 'Security Activity',
    eventType: evt.event_type,
    severity: evt.severity,
    timestamp: evt.created_at,
    sourceIp: evt.source_ip
  }));
}

module.exports = {
  recordSecurityEvent,
  getUserRecentEvents,
  VALID_EVENT_TYPES,
  VALID_SEVERITIES,
  slidingWindows
};
