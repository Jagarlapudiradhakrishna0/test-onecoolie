/**
 * server/src/routes/securityRoutes.js
 *
 * ONECOOLIE Phase 6.7: Security Monitoring & Incident Response Routes
 *
 * Exposes:
 * 1. User Security Activity:
 *    - GET /api/security/my-events (Authenticated user's recent security events)
 *
 * 2. Admin Security Monitoring & Incident Command:
 *    - GET /api/admin/security/incidents (List / filter incidents, RBAC: security:read)
 *    - GET /api/admin/security/incidents/metrics (Summary counts for dashboard, RBAC: security:read)
 *    - GET /api/admin/security/incidents/:incidentId (Incident detail & events, RBAC: security:read)
 *    - POST /api/admin/security/incidents/:incidentId/acknowledge (RBAC: security:respond)
 *    - POST /api/admin/security/incidents/:incidentId/resolve (RBAC: security:respond)
 *    - POST /api/admin/security/incidents/:incidentId/dismiss (RBAC: security:respond)
 *    - POST /api/admin/security/incidents/:incidentId/respond (Manual containment, RBAC: security:respond)
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/adminMiddleware');
const defaultSupabase = require('../config/db');
const { getUserRecentEvents } = require('../services/securityMonitoringService');
const {
  acknowledgeIncident,
  resolveIncident,
  dismissIncident
} = require('../services/securityIncidentService');
const { executeAdminManualResponse } = require('../services/securityResponseService');
const { logger } = require('../utils/logger');

/*
|--------------------------------------------------------------------------
| User Security Activity
|--------------------------------------------------------------------------
*/
router.get('/my-events', protect, async (req, res) => {
  try {
    const events = await getUserRecentEvents(req.user.id);
    return res.status(200).json({
      success: true,
      events
    });
  } catch (err) {
    logger.error('[SECURITY_API] Error retrieving user security events:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve security events.'
    });
  }
});

/*
|--------------------------------------------------------------------------
| Admin Security Metrics
|--------------------------------------------------------------------------
*/
router.get(
  '/admin/incidents/metrics',
  protect,
  requirePermission('security:read'),
  async (req, res) => {
    try {
      const now = new Date();
      const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // Query incidents status counts
      const { data: openIncidents } = await defaultSupabase
        .from('security_incidents')
        .select('id, severity, status')
        .in('status', ['open', 'investigating']);

      const openCount = openIncidents?.length || 0;
      const criticalCount = openIncidents?.filter(i => i.severity === 'critical').length || 0;
      const highCount = openIncidents?.filter(i => i.severity === 'high').length || 0;

      // Query 24h events counts
      const { data: recentEvents } = await defaultSupabase
        .from('security_events')
        .select('id, event_type')
        .gte('created_at', past24h);

      const events24h = recentEvents?.length || 0;
      const failedLogins24h = recentEvents?.filter(e => e.event_type === 'login_failed').length || 0;
      const mfaFailures24h = recentEvents?.filter(e => e.event_type === 'mfa_failed').length || 0;
      const refreshReuse24h = recentEvents?.filter(e => e.event_type === 'refresh_token_reuse_detected').length || 0;

      // Query active containment actions
      const { data: containedIncidents } = await defaultSupabase
        .from('security_incidents')
        .select('id')
        .eq('status', 'contained');

      return res.status(200).json({
        success: true,
        metrics: {
          openIncidents: openCount,
          criticalIncidents: criticalCount,
          highSeverityIncidents: highCount,
          securityEvents24h: events24h,
          failedLogins24h,
          mfaFailures24h,
          refreshReuseEvents: refreshReuse24h,
          activeContainments: containedIncidents?.length || 0
        }
      });
    } catch (err) {
      logger.error('[SECURITY_API] Error fetching security metrics:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch security metrics.'
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Admin List Incidents
|--------------------------------------------------------------------------
*/
router.get(
  '/admin/incidents',
  protect,
  requirePermission('security:read'),
  async (req, res) => {
    try {
      const {
        status,
        severity,
        incidentType,
        userId,
        page = 1,
        limit = 20
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      let query = defaultSupabase
        .from('security_incidents')
        .select('*', { count: 'exact' });

      if (status) query = query.eq('status', status);
      if (severity) query = query.eq('severity', severity);
      if (incidentType) query = query.eq('incident_type', incidentType);
      if (userId) query = query.eq('user_id', userId);

      const { data: incidents, count, error } = await query
        .order('last_detected_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (error) throw new Error(error.message);

      return res.status(200).json({
        success: true,
        incidents: incidents || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum)
        }
      });
    } catch (err) {
      logger.error('[SECURITY_API] Error listing incidents:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve security incidents.'
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Admin Incident Detail & Forensics
|--------------------------------------------------------------------------
*/
router.get(
  '/admin/incidents/:incidentId',
  protect,
  requirePermission('security:read'),
  async (req, res) => {
    try {
      const { incidentId } = req.params;

      const { data: incident, error: incErr } = await defaultSupabase
        .from('security_incidents')
        .select('*')
        .eq('id', incidentId)
        .maybeSingle();

      if (incErr || !incident) {
        return res.status(404).json({
          success: false,
          message: 'Incident not found.'
        });
      }

      // Fetch linked events
      const { data: linkRows } = await defaultSupabase
        .from('security_incident_events')
        .select('event_id')
        .eq('incident_id', incidentId);

      const eventIds = (linkRows || []).map(r => r.event_id);
      let events = [];
      if (eventIds.length > 0) {
        const { data: eventData } = await defaultSupabase
          .from('security_events')
          .select('*')
          .in('id', eventIds)
          .order('created_at', { ascending: true });
        events = eventData || [];
      }

      // Fetch response actions
      const { data: responseActions } = await defaultSupabase
        .from('security_response_actions')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });

      return res.status(200).json({
        success: true,
        incident,
        events,
        responseActions: responseActions || []
      });
    } catch (err) {
      logger.error('[SECURITY_API] Error fetching incident detail:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch incident details.'
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Admin Incident State Transitions
|--------------------------------------------------------------------------
*/
router.post(
  '/admin/incidents/:incidentId/acknowledge',
  protect,
  requirePermission('security:respond'),
  async (req, res) => {
    try {
      const incident = await acknowledgeIncident(req.params.incidentId, req.user);
      return res.status(200).json({
        success: true,
        message: 'Incident acknowledged and marked under investigation.',
        incident
      });
    } catch (err) {
      logger.error('[SECURITY_API] Acknowledge failed:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.post(
  '/admin/incidents/:incidentId/resolve',
  protect,
  requirePermission('security:respond'),
  async (req, res) => {
    try {
      const incident = await resolveIncident(req.params.incidentId, req.user);
      return res.status(200).json({
        success: true,
        message: 'Incident resolved.',
        incident
      });
    } catch (err) {
      logger.error('[SECURITY_API] Resolve failed:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.post(
  '/admin/incidents/:incidentId/dismiss',
  protect,
  requirePermission('security:respond'),
  async (req, res) => {
    try {
      const incident = await dismissIncident(req.params.incidentId, req.user);
      return res.status(200).json({
        success: true,
        message: 'Incident dismissed.',
        incident
      });
    } catch (err) {
      logger.error('[SECURITY_API] Dismiss failed:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Admin Manual Containment Response
|--------------------------------------------------------------------------
*/
router.post(
  '/admin/incidents/:incidentId/respond',
  protect,
  requirePermission('security:respond'),
  async (req, res) => {
    try {
      const { action } = req.body;
      const result = await executeAdminManualResponse({
        incidentId: req.params.incidentId,
        action,
        adminUser: req.user,
        req
      });

      return res.status(200).json({
        success: true,
        message: `Containment action '${action}' executed successfully.`,
        result
      });
    } catch (err) {
      logger.error('[SECURITY_API] Manual response failed:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
