/**
 * server/src/services/securityIncidentService.js
 *
 * ONECOOLIE Phase 6.7: Incident Lifecycle & Deduplication Service
 *
 * Responsibilities:
 * - Incident creation with intelligent deduplication window (prevents alert storms).
 * - Lifecycle state machine: open -> investigating -> contained -> resolved / dismissed.
 * - In-memory containment registry for real-time securityIncidentGuard lookups.
 * - Integration with securityResponseService for automated containment.
 */

const crypto = require('crypto');
const defaultSupabase = require('../config/db');
const { logger } = require('../utils/logger');

function getAutomatedResponseHandler() {
  try {
    const resp = require('./securityResponseService');
    return resp.executeAutomatedResponse;
  } catch {
    return null;
  }
}

// In-memory sets of IDs under active containment (guarantees O(1) latency in guard middleware)
const containedSessions = new Set();
const containedUsers = new Set();

/**
 * Checks if a session ID is currently under active containment.
 * @param {string} sessionId
 * @returns {boolean}
 */
function isSessionUnderContainment(sessionId) {
  return sessionId ? containedSessions.has(sessionId) : false;
}

/**
 * Checks if a user ID is currently under active containment.
 * @param {string} userId
 * @returns {boolean}
 */
function isUserUnderContainment(userId) {
  return userId ? containedUsers.has(userId) : false;
}

/**
 * Sets in-memory containment state.
 * @param {string} type - 'session' | 'user'
 * @param {string} id
 * @param {boolean} active
 */
function setContainmentState(type, id, active) {
  if (!id) return;
  const targetSet = type === 'session' ? containedSessions : containedUsers;
  if (active) {
    targetSet.add(id);
  } else {
    targetSet.delete(id);
  }
}

/**
 * Creates or updates an incident with deduplication.
 * If an open or investigating incident matching (incidentType, userId, familyId, sourceIp)
 * exists within the 10-minute deduplication window, increment event_count instead of creating a duplicate.
 *
 * @param {object} params
 * @param {string} params.incidentType
 * @param {'low' | 'medium' | 'high' | 'critical'} params.severity
 * @param {string} [params.userId]
 * @param {string} [params.sessionId]
 * @param {string} [params.familyId]
 * @param {string} [params.sourceIp]
 * @param {string} [params.eventId]
 * @param {object} [params.metadata]
 * @param {object} [params.client]
 * @returns {Promise<object>}
 */
async function createOrUpdateIncident({
  incidentType,
  severity = 'medium',
  userId = null,
  sessionId = null,
  familyId = null,
  sourceIp = null,
  eventId = null,
  metadata = {},
  client = defaultSupabase
}) {
  const now = new Date();
  const nowIso = now.toISOString();
  const dedupWindow = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

  let incident = null;

  try {
    // 1. Check for existing active incident to deduplicate
    let query = client
      .from('security_incidents')
      .select('*')
      .eq('incident_type', incidentType)
      .in('status', ['open', 'investigating'])
      .gte('last_detected_at', dedupWindow);

    if (familyId) {
      query = query.eq('family_id', familyId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else if (sourceIp) {
      query = query.eq('source_ip', sourceIp);
    }

    const { data: existingIncidents } = await query.order('last_detected_at', { ascending: false }).limit(1);

    if (existingIncidents && existingIncidents.length > 0) {
      const existing = existingIncidents[0];
      const newCount = (existing.event_count || 1) + 1;

      // Escalate severity if repeated
      let newSeverity = existing.severity;
      if (newCount >= 5 && existing.severity === 'low') newSeverity = 'medium';
      if (newCount >= 10 && existing.severity === 'medium') newSeverity = 'high';
      if (newCount >= 20 && existing.severity === 'high') newSeverity = 'critical';

      const { data: updated, error: updErr } = await client
        .from('security_incidents')
        .update({
          event_count: newCount,
          severity: newSeverity,
          last_detected_at: nowIso,
          updated_at: nowIso,
          metadata: { ...existing.metadata, ...metadata, last_event_id: eventId }
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (!updErr && updated) {
        incident = updated;
        logger.info(`[SECURITY_INCIDENT] Deduplicated and updated incident ${incident.id} (count: ${newCount})`);
      }
    }

    // 2. If no existing incident, create new incident record
    if (!incident) {
      const newRecord = {
        id: crypto.randomUUID ? crypto.randomUUID() : undefined,
        incident_type: incidentType,
        severity,
        status: 'open',
        user_id: userId,
        session_id: sessionId,
        family_id: familyId,
        source_ip: sourceIp,
        event_count: 1,
        containment_action: null,
        metadata,
        first_detected_at: nowIso,
        last_detected_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso
      };

      const { data: created, error: createErr } = await client
        .from('security_incidents')
        .insert([newRecord])
        .select()
        .single();

      if (createErr) {
        logger.error('[SECURITY_INCIDENT] Failed to persist new incident:', createErr);
        incident = newRecord;
      } else {
        incident = created;
        logger.warn(`[SECURITY_INCIDENT] New ${severity.toUpperCase()} incident created: ${incidentType} (${incident.id})`);
      }
    }

    // 3. Link event to incident if eventId provided
    if (incident && incident.id && eventId) {
      await client
        .from('security_incident_events')
        .insert([{
          incident_id: incident.id,
          event_id: eventId,
          created_at: nowIso
        }])
        .catch(() => {});
    }

    // 4. Update in-memory containment if incident is critical or contained
    if (severity === 'critical') {
      if (sessionId) setContainmentState('session', sessionId, true);
      if (userId) setContainmentState('user', userId, true);
    }

    // 5. Trigger automated response action
    if (incident) {
      const runAutomated = getAutomatedResponseHandler();
      if (typeof runAutomated === 'function') {
        runAutomated(incident, client).catch((respErr) => {
          logger.error('[SECURITY_INCIDENT] Automated response failed:', respErr);
        });
      }
    }

    return incident;

  } catch (err) {
    logger.error('[SECURITY_INCIDENT] Unexpected error in createOrUpdateIncident:', err);
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : 'fallback-incident-id',
      incident_type: incidentType,
      severity,
      status: 'open'
    };
  }
}

/**
 * Acknowledges an incident (transitions open -> investigating).
 */
async function acknowledgeIncident(incidentId, adminUser, client = defaultSupabase) {
  const { data, error } = await client
    .from('security_incidents')
    .update({
      status: 'investigating',
      assigned_admin_id: adminUser.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', incidentId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Resolves an incident (transitions to resolved).
 */
async function resolveIncident(incidentId, adminUser, client = defaultSupabase) {
  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from('security_incidents')
    .update({
      status: 'resolved',
      resolved_at: nowIso,
      assigned_admin_id: adminUser.id,
      updated_at: nowIso
    })
    .eq('id', incidentId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Clear from containment sets
  if (data?.session_id) setContainmentState('session', data.session_id, false);
  if (data?.user_id) setContainmentState('user', data.user_id, false);

  return data;
}

/**
 * Dismisses a false positive incident.
 */
async function dismissIncident(incidentId, adminUser, client = defaultSupabase) {
  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from('security_incidents')
    .update({
      status: 'dismissed',
      resolved_at: nowIso,
      assigned_admin_id: adminUser.id,
      updated_at: nowIso
    })
    .eq('id', incidentId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (data?.session_id) setContainmentState('session', data.session_id, false);
  if (data?.user_id) setContainmentState('user', data.user_id, false);

  return data;
}

module.exports = {
  createOrUpdateIncident,
  acknowledgeIncident,
  resolveIncident,
  dismissIncident,
  isSessionUnderContainment,
  isUserUnderContainment,
  setContainmentState
};
