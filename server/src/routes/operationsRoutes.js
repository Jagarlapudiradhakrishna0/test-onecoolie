/**
 * server/src/routes/operationsRoutes.js
 *
 * ONECOOLIE Phase 6.8: Production Operations & Reliability Routes
 *
 * Exposes administrative APIs for:
 * - Platform operational status, health, and aggregate metrics
 * - On-demand deployment verification
 * - Deployment verification history
 * - Disaster recovery status & drill recording
 *
 * RBAC Protected: Requires operations:read, operations:verify, or operations:manage.
 * STRICT SECURITY: Zero exposure of secrets, database credentials, or internal stack traces.
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/adminMiddleware');
const defaultSupabase = require('../config/db');
const { getLiveness, getReadiness } = require('../services/healthService');
const { getSnapshot } = require('../services/metricsService');
const { runDeploymentVerification } = require('../services/deploymentVerificationService');
const { getRecoveryStatus, recordRecoveryVerification } = require('../services/recoveryVerificationService');
const { logAdminAction } = require('../services/adminAuditService');
const { logger } = require('../utils/logger');

/*
|--------------------------------------------------------------------------
| 1. Platform Operational Status & Aggregate Metrics
|--------------------------------------------------------------------------
| RBAC: operations:read
*/
router.get('/status', protect, requirePermission('operations:read'), async (req, res) => {
  try {
    const liveness = getLiveness();
    const readiness = await getReadiness({ bypassCache: false });
    const metrics = getSnapshot();

    return res.status(200).json({
      success: true,
      service: 'onecoolie-api',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      liveness,
      readiness,
      metrics
    });
  } catch (err) {
    logger.error('[OPERATIONS_API] Error generating platform status:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve platform operational status.'
    });
  }
});

/*
|--------------------------------------------------------------------------
| 2. Run On-Demand Deployment Verification
|--------------------------------------------------------------------------
| RBAC: operations:verify
*/
router.post('/verify-deployment', protect, requirePermission('operations:verify'), async (req, res) => {
  try {
    const report = await runDeploymentVerification({
      client: defaultSupabase,
      verifiedBy: req.user.id,
      recordResult: true
    });

    await logAdminAction({
      req,
      action: 'deployment_verification_executed',
      resource_type: 'deployment',
      resource_id: report.environment,
      result: report.success ? 'success' : 'failure',
      metadata: { status: report.status, checksCount: report.checks.length }
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      report
    });
  } catch (err) {
    logger.error('[OPERATIONS_API] Error running deployment verification:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete deployment verification.'
    });
  }
});

/*
|--------------------------------------------------------------------------
| 3. Deployment Verification History
|--------------------------------------------------------------------------
| RBAC: operations:read
*/
router.get('/deployment-verifications', protect, requirePermission('operations:read'), async (req, res) => {
  try {
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 20), 100);

    const { data, error } = await defaultSupabase
      .from('deployment_verifications')
      .select('id, environment, verification_type, status, summary, metadata, verified_by, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.warn('[OPERATIONS_API] Query error for deployment_verifications:', error.message);
      return res.status(200).json({ success: true, verifications: [] });
    }

    return res.status(200).json({
      success: true,
      verifications: data || []
    });
  } catch (err) {
    logger.error('[OPERATIONS_API] Error retrieving deployment verifications:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve deployment verification history.'
    });
  }
});

/*
|--------------------------------------------------------------------------
| 4. Disaster Recovery & Backup Readiness Status
|--------------------------------------------------------------------------
| RBAC: operations:read
*/
router.get('/recovery-status', protect, requirePermission('operations:read'), async (req, res) => {
  try {
    const status = await getRecoveryStatus({ client: defaultSupabase });
    return res.status(200).json({
      success: true,
      recovery: status
    });
  } catch (err) {
    logger.error('[OPERATIONS_API] Error retrieving disaster recovery status:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recovery status.'
    });
  }
});

/*
|--------------------------------------------------------------------------
| 5. Record Recovery Drill or Manual Verification
|--------------------------------------------------------------------------
| RBAC: operations:manage
*/
router.post('/recovery-verifications', protect, requirePermission('operations:manage'), async (req, res) => {
  try {
    const { verificationType, status, backupReference, rpoTarget, rtoTarget, metadata } = req.body;

    if (!verificationType) {
      return res.status(400).json({
        success: false,
        message: 'verificationType is required.'
      });
    }

    const record = await recordRecoveryVerification({
      verificationType,
      status: status || 'verified',
      backupReference,
      rpoTarget,
      rtoTarget,
      metadata,
      verifiedBy: req.user.id,
      client: defaultSupabase
    });

    await logAdminAction({
      req,
      action: 'recovery_verification_recorded',
      resource_type: 'disaster_recovery',
      resource_id: record.id || 'recovery_record',
      result: 'success',
      metadata: { verificationType, status: record.status }
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      record
    });
  } catch (err) {
    logger.error('[OPERATIONS_API] Error recording recovery verification:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to record recovery verification.'
    });
  }
});

module.exports = router;
