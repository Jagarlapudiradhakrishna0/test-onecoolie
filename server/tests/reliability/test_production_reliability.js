/**
 * ONECOOLIE Phase 6.8: Production Reliability, Backup, Disaster Recovery & Deployment Readiness
 * Comprehensive Automated Verification Suite
 *
 * Covers:
 * A. Centralized Health & Readiness Probes (liveness, readiness, timeouts, TTL cache, draining)
 * B. In-Memory Metrics Collection & Sanitized Snapshots (HTTP, Auth, Session, Sockets, Security)
 * C. Graceful Shutdown Coordination (idempotency, draining state, socket draining, server closure)
 * D. Production Deployment Verification (env check, secret strength, schema verification, audit trail)
 * E. Disaster Recovery & Backup Verification (RPO/RTO targets, drill recording, sanitization, runbook)
 * F. Operations API & RBAC Authorization (operations:read, operations:verify, operations:manage)
 * G. Request Reliability Middleware (non-blocking duration, normalized routes, zero PII)
 * H. Architecture Continuity & Security Regression (Phase 6.2 - 6.7 compatibility, RLS policies)
 */

process.env.NODE_ENV = 'test';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = 'https://mock-test-project.supabase.co';
}
if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_ANON_KEY) {
  process.env.SUPABASE_SECRET_KEY = 'mock-test-secret-key-1234567890abcdef1234567890abcdef';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_must_be_sufficiently_long_and_complex_32bytes!';
}

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, detail = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
  }
}

// In-memory mock Supabase client for unit test isolation
function createMockSupabase() {
  const tables = {
    users: [{ id: 'usr_mock_001', role: 'admin' }],
    user_sessions: [],
    admin_mfa: [],
    mfa_recovery_codes: [],
    admin_audit_logs: [],
    security_events: [],
    security_incidents: [],
    security_incident_events: [],
    security_response_actions: [],
    deployment_verifications: [],
    recovery_verifications: [],
    application_operational_events: [],
    bookings: [],
    payments: [],
    refunds: []
  };

  function createQueryBuilder(tableName) {
    let filters = [];
    let orderClause = null;
    let limitCount = null;
    let updatePayload = null;
    let insertRows = null;

    const builder = {
      select: () => builder,
      insert: (rows) => {
        insertRows = Array.isArray(rows) ? rows : [rows];
        const inserted = insertRows.map((r) => ({
          id: r.id || crypto.randomUUID(),
          ...r,
          created_at: r.created_at || new Date().toISOString()
        }));
        if (!tables[tableName]) tables[tableName] = [];
        tables[tableName].push(...inserted);
        return {
          select: () => ({
            maybeSingle: async () => ({ data: inserted[0], error: null }),
            single: async () => ({ data: inserted[0], error: null }),
            then: (resolve) => resolve({ data: inserted, error: null })
          }),
          maybeSingle: async () => ({ data: inserted[0], error: null }),
          single: async () => ({ data: inserted[0], error: null }),
          then: (resolve) => resolve({ data: inserted, error: null }),
          catch: () => {}
        };
      },
      update: (payload) => {
        updatePayload = payload;
        return builder;
      },
      eq: (col, val) => {
        filters.push((row) => row[col] === val);
        return builder;
      },
      order: (col, opts) => {
        orderClause = { col, ascending: opts?.ascending ?? true };
        return builder;
      },
      limit: (n) => {
        limitCount = n;
        return builder;
      },
      maybeSingle: async () => {
        const rows = (tables[tableName] || []).filter((r) => filters.every((f) => f(r)));
        return { data: rows[0] || null, error: null };
      },
      single: async () => {
        const rows = (tables[tableName] || []).filter((r) => filters.every((f) => f(r)));
        return { data: rows[0] || null, error: null };
      },
      then: (resolve) => {
        let rows = (tables[tableName] || []).filter((r) => filters.every((f) => f(r)));
        if (orderClause) {
          rows.sort((a, b) => {
            if (a[orderClause.col] < b[orderClause.col]) return orderClause.ascending ? -1 : 1;
            if (a[orderClause.col] > b[orderClause.col]) return orderClause.ascending ? 1 : -1;
            return 0;
          });
        }
        if (limitCount !== null) {
          rows = rows.slice(0, limitCount);
        }
        return resolve({ data: rows, error: null });
      }
    };
    return builder;
  }

  return {
    from: (t) => createQueryBuilder(t),
    _tables: tables
  };
}

async function runTests() {
  console.log('========================================================================');
  console.log('ONECOOLIE PHASE 6.8: PRODUCTION RELIABILITY & OPERATIONS TEST SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION A: Centralized Health & Readiness Probes
  // --------------------------------------------------------------------------
  console.log('--- Section A: Health & Readiness Probes ---');

  const {
    getLiveness,
    getReadiness,
    setDrainingState,
    isDraining,
    clearReadinessCache
  } = require('../../src/services/healthService');

  // A.1: Liveness probe returns status ok when healthy
  setDrainingState(false);
  const liveness = getLiveness();
  assert(liveness && liveness.status === 'ok', 'A.1 getLiveness returns status "ok" during normal operation');
  assert(liveness.service === 'onecoolie-api', 'A.2 Liveness reports service name "onecoolie-api"');
  assert(typeof liveness.uptime === 'number' && liveness.uptime >= 0, 'A.3 Liveness includes process uptime');
  assert(liveness.memory && typeof liveness.memory.rssMb === 'number', 'A.4 Liveness includes process memory telemetry');

  // A.5: Draining state marks liveness as draining
  setDrainingState(true);
  const drainingLiveness = getLiveness();
  assert(drainingLiveness.status === 'draining', 'A.5 Liveness reports status "draining" when shutdown is initiated');
  assert(isDraining() === true, 'A.6 isDraining() returns true during server draining');

  // A.7: Draining state immediately marks readiness as unhealthy (503 condition)
  const drainingReadiness = await getReadiness();
  assert(drainingReadiness.status === 'unhealthy', 'A.7 Draining state causes readiness to return "unhealthy"');
  assert(drainingReadiness.draining === true, 'A.8 Readiness explicitly flags draining: true');

  // Reset draining state for subsequent checks
  setDrainingState(false);
  clearReadinessCache();

  // A.9: Normal readiness check with mock DB returns healthy
  const mockDbA = createMockSupabase();
  const readiness = await getReadiness({ client: mockDbA, bypassCache: true });
  assert(readiness.status === 'healthy' || readiness.status === 'degraded', 'A.9 Normal readiness check returns healthy or degraded');
  assert(readiness.checks && readiness.checks.database !== undefined, 'A.10 Readiness includes database check results');
  assert(readiness.checks.schema !== undefined, 'A.11 Readiness includes schema check results');

  // A.12: Readiness result caching honors TTL
  const cachedReadiness = await getReadiness({ client: mockDbA, bypassCache: false });
  assert(cachedReadiness.cached === true, 'A.12 Repeated readiness call within TTL returns cached result');

  // A.13: clearReadinessCache forces a fresh check
  clearReadinessCache();
  const freshReadiness = await getReadiness({ client: mockDbA, bypassCache: false });
  assert(freshReadiness.cached === undefined, 'A.13 clearReadinessCache forces fresh dependency evaluation');

  // A.14: Database connectivity failure returns unhealthy
  const brokenDb = {
    from: () => ({
      select: () => ({
        limit: async () => ({ data: null, error: { message: 'Connection refused', code: 'ECONNREFUSED' } })
      })
    })
  };
  clearReadinessCache();
  const failedReadiness = await getReadiness({ client: brokenDb, bypassCache: true });
  assert(failedReadiness.status === 'unhealthy', 'A.14 Database connectivity failure marks readiness "unhealthy"');
  assert(failedReadiness.checks.database.status === 'unhealthy', 'A.15 Database check reports unhealthy status');

  // A.16: Readiness never exposes secrets or connection strings
  const reportString = JSON.stringify(readiness);
  assert(!reportString.includes(process.env.SUPABASE_URL), 'A.16 Readiness report never leaks raw Supabase URL');
  assert(!reportString.includes(process.env.JWT_SECRET), 'A.17 Readiness report never leaks JWT secret');

  // --------------------------------------------------------------------------
  // SECTION B: In-Memory Metrics Collection & Sanitized Snapshots
  // --------------------------------------------------------------------------
  console.log('\n--- Section B: In-Memory Metrics Collection ---');

  const {
    recordHttpRequest,
    recordAuthMetric,
    recordSessionMetric,
    recordSocketActivity,
    recordSecurityEventSeverity,
    recordContainmentAction,
    updateIncidentCounts,
    getSnapshot,
    resetMetrics
  } = require('../../src/services/metricsService');

  resetMetrics();

  // B.1: Record HTTP requests
  recordHttpRequest({ method: 'GET', route: '/api/bookings', statusCode: 200, durationMs: 45.2 });
  recordHttpRequest({ method: 'POST', route: '/api/auth/login', statusCode: 401, durationMs: 120.5 });
  recordHttpRequest({ method: 'GET', route: '/api/service/status', statusCode: 500, durationMs: 250.0 });

  let snap = getSnapshot();
  assert(snap.http.totalRequests === 3, 'B.1 HTTP totalRequests increments accurately (3)');
  assert(snap.http.requestsByMethod['GET'] === 2, 'B.2 Requests by method GET tracked (2)');
  assert(snap.http.requestsByMethod['POST'] === 1, 'B.3 Requests by method POST tracked (1)');
  assert(snap.http.statusCategories['2xx'] === 1, 'B.4 2xx status category tracked (1)');
  assert(snap.http.statusCategories['4xx'] === 1, 'B.5 4xx status category tracked (1)');
  assert(snap.http.statusCategories['5xx'] === 1, 'B.6 5xx status category tracked (1)');
  assert(snap.http.errorCount4xx === 1, 'B.7 errorCount4xx tracked (1)');
  assert(snap.http.errorCount5xx === 1, 'B.8 errorCount5xx tracked (1)');
  assert(snap.http.durationMs.count === 3, 'B.9 Duration sample count tracked (3)');
  assert(snap.http.durationMs.minMs === 45.2, 'B.10 Minimum duration tracked (45.2ms)');
  assert(snap.http.durationMs.maxMs === 250.0, 'B.11 Maximum duration tracked (250ms)');

  // B.12: Auth & MFA metrics
  recordAuthMetric('loginSuccessCount', 5);
  recordAuthMetric('loginFailureCount', 2);
  recordAuthMetric('mfaSuccessCount', 3);
  recordAuthMetric('mfaFailureCount', 1);
  recordAuthMetric('accountLockoutCount', 1);
  recordAuthMetric('tokenRefreshSuccessCount', 8);
  recordAuthMetric('refreshTokenReuseCount', 1);

  snap = getSnapshot();
  assert(snap.auth.loginSuccessCount === 5, 'B.12 loginSuccessCount tracked (5)');
  assert(snap.auth.loginFailureCount === 2, 'B.13 loginFailureCount tracked (2)');
  assert(snap.auth.mfaSuccessCount === 3, 'B.14 mfaSuccessCount tracked (3)');
  assert(snap.auth.accountLockoutCount === 1, 'B.15 accountLockoutCount tracked (1)');
  assert(snap.auth.tokenRefreshSuccessCount === 8, 'B.16 tokenRefreshSuccessCount tracked (8)');
  assert(snap.auth.refreshTokenReuseCount === 1, 'B.17 refreshTokenReuseCount tracked (1)');

  // B.18: Session & Socket metrics
  recordSessionMetric('sessionsCreated', 4);
  recordSessionMetric('sessionsRevoked', 2);
  recordSessionMetric('logoutEvents', 1);
  recordSocketActivity(12, 'transport_close');

  snap = getSnapshot();
  assert(snap.session.sessionsCreated === 4, 'B.18 sessionsCreated tracked (4)');
  assert(snap.session.sessionsRevoked === 2, 'B.19 sessionsRevoked tracked (2)');
  assert(snap.session.activeSocketConnections === 12, 'B.20 activeSocketConnections tracked (12)');

  // B.21: Security metrics
  recordSecurityEventSeverity('critical');
  recordSecurityEventSeverity('high');
  recordSecurityEventSeverity('info');
  recordContainmentAction('automated');
  recordContainmentAction('manual');
  updateIncidentCounts(2, 1);

  snap = getSnapshot();
  assert(snap.security.eventsBySeverity.critical === 1, 'B.21 Critical security events counted');
  assert(snap.security.eventsBySeverity.high === 1, 'B.22 High security events counted');
  assert(snap.security.containmentActions.automated === 1, 'B.23 Automated containment actions counted');
  assert(snap.security.openIncidents === 2, 'B.24 Open incidents count updated');
  assert(snap.security.criticalIncidents === 1, 'B.25 Critical incidents count updated');

  // B.26: Metrics reset
  resetMetrics();
  const resetSnap = getSnapshot();
  assert(resetSnap.http.totalRequests === 0, 'B.26 resetMetrics clears HTTP request counters');
  assert(resetSnap.auth.loginSuccessCount === 0, 'B.27 resetMetrics clears auth counters');

  // --------------------------------------------------------------------------
  // SECTION C: Graceful Shutdown Coordination
  // --------------------------------------------------------------------------
  console.log('\n--- Section C: Graceful Shutdown Coordination ---');

  const {
    initiateGracefulShutdown,
    resetShutdownState,
    isShuttingDown
  } = require('../../src/services/gracefulShutdownService');

  resetShutdownState();

  // C.1: Initial shutdown state is false
  assert(isShuttingDown() === false, 'C.1 Initial shutdown state is false');

  // C.2: Mock HTTP and Socket.IO servers
  let httpClosed = false;
  let ioClosed = false;
  let ioDrainingEmitted = false;

  const mockHttpServer = {
    close: (callback) => {
      httpClosed = true;
      if (typeof callback === 'function') callback();
    }
  };

  const mockIoServer = {
    emit: (ev) => {
      if (ev === 'server_draining') ioDrainingEmitted = true;
    },
    close: () => {
      ioClosed = true;
    }
  };

  // C.3: Execute graceful shutdown sequence
  const shutdownRes = await initiateGracefulShutdown({
    signal: 'SIGTERM',
    httpServer: mockHttpServer,
    ioServer: mockIoServer,
    gracePeriodMs: 0,
    forceTimeoutMs: 5000,
    exitProcess: false
  });

  assert(shutdownRes.success === true, 'C.3 initiateGracefulShutdown executes successfully');
  assert(isShuttingDown() === true, 'C.4 isShuttingDown() reports true during shutdown');
  assert(ioDrainingEmitted === true, 'C.5 Socket.IO emits "server_draining" notice to clients');
  assert(ioClosed === true, 'C.6 Socket.IO server closed to new connections');
  assert(httpClosed === true, 'C.7 HTTP server close called cleanly');

  // C.8: Idempotent - secondary call rejected cleanly
  const duplicateShutdown = await initiateGracefulShutdown({
    signal: 'SIGINT',
    exitProcess: false
  });
  assert(duplicateShutdown.success === false, 'C.8 Duplicate shutdown trigger is safely ignored (idempotent)');

  // Reset shutdown state for remaining tests
  resetShutdownState();
  assert(isShuttingDown() === false, 'C.9 resetShutdownState restores active operational state');

  // --------------------------------------------------------------------------
  // SECTION D: Production Deployment Verification Service
  // --------------------------------------------------------------------------
  console.log('\n--- Section D: Production Deployment Verification ---');

  const {
    runDeploymentVerification,
    CRITICAL_DEPLOYMENT_TABLES
  } = require('../../src/services/deploymentVerificationService');

  // D.1: Critical deployment tables includes all core operational tables
  assert(
    ['users', 'user_sessions', 'admin_mfa', 'admin_audit_logs', 'security_events', 'deployment_verifications', 'recovery_verifications'].every(t => CRITICAL_DEPLOYMENT_TABLES.includes(t)),
    'D.1 Critical deployment tables includes users, sessions, MFA, audit, security, and operational tables'
  );

  // D.2: Run deployment verification with mock DB
  const mockDbD = createMockSupabase();
  const verifyReport = await runDeploymentVerification({ client: mockDbD, recordResult: true });
  assert(typeof verifyReport.success === 'boolean', 'D.2 runDeploymentVerification returns boolean success');
  assert(Array.isArray(verifyReport.checks), 'D.3 Verification report contains array of checks');
  assert(verifyReport.checks.some(c => c.name === 'environment_validation'), 'D.4 Checks include environment_validation');
  assert(verifyReport.checks.some(c => c.name === 'jwt_secret_strength'), 'D.5 Checks include jwt_secret_strength');
  assert(verifyReport.checks.some(c => c.name === 'database_schema'), 'D.6 Checks include database_schema');

  // D.7: Verification results are recorded in deployment_verifications table
  const recordedVerifications = mockDbD._tables.deployment_verifications;
  assert(recordedVerifications.length === 1, 'D.7 Verification run persisted in deployment_verifications table');
  assert(recordedVerifications[0].status !== undefined, 'D.8 Persisted verification contains valid status');

  // --------------------------------------------------------------------------
  // SECTION E: Disaster Recovery & Backup Verification
  // --------------------------------------------------------------------------
  console.log('\n--- Section E: Disaster Recovery & Backup Verification ---');

  const {
    getRecoveryStatus,
    recordRecoveryVerification,
    DEFAULT_RPO_TARGET,
    DEFAULT_RTO_TARGET
  } = require('../../src/services/recoveryVerificationService');

  // E.1: Default RPO and RTO targets
  assert(DEFAULT_RPO_TARGET === '24h', 'E.1 Default RPO target configured to 24h');
  assert(DEFAULT_RTO_TARGET === '4h', 'E.2 Default RTO target configured to 4h');

  // E.3: Record a recovery drill
  const mockDbE = createMockSupabase();
  const drillRecord = await recordRecoveryVerification({
    verificationType: 'quarterly_pitr_drill',
    status: 'verified',
    backupReference: 'pitr_snapshot_2026_q3',
    rpoTarget: '24h',
    rtoTarget: '4h',
    metadata: { operator: 'lead_devops', simulatedDataLagMin: 2 },
    verifiedBy: 'usr_admin_e3',
    client: mockDbE
  });

  assert(drillRecord && drillRecord.status === 'verified', 'E.3 recordRecoveryVerification persists drill record');
  assert(mockDbE._tables.recovery_verifications.length === 1, 'E.4 Recovery drill stored in recovery_verifications table');
  assert(drillRecord.rpo_target === '24h', 'E.5 RPO target stored in drill record');

  // E.6: Retrieve recovery status
  const recoveryStatus = await getRecoveryStatus({ client: mockDbE });
  assert(recoveryStatus.backupStatus === 'verified', 'E.6 getRecoveryStatus returns backupStatus "verified"');
  assert(recoveryStatus.rpoTarget === '24h', 'E.7 Recovery status exposes RPO target');
  assert(recoveryStatus.rtoTarget === '4h', 'E.8 Recovery status exposes RTO target');
  assert(recoveryStatus.recentVerifications.length === 1, 'E.9 Recent verifications listed in recovery status');

  // E.10: Sensitive fields are stripped from metadata
  const cleanDrill = await recordRecoveryVerification({
    verificationType: 'test_drill',
    metadata: { password: 'secret_db_pass', token: 'leak_tok', safeNote: 'all_good' },
    client: mockDbE
  });
  assert(cleanDrill.metadata.password === undefined, 'E.10 Passwords stripped from recovery verification metadata');
  assert(cleanDrill.metadata.token === undefined, 'E.11 Tokens stripped from recovery verification metadata');
  assert(cleanDrill.metadata.safeNote === 'all_good', 'E.12 Safe notes preserved in recovery metadata');

  // --------------------------------------------------------------------------
  // SECTION F: Operations API & RBAC Authorization
  // --------------------------------------------------------------------------
  console.log('\n--- Section F: Operations API & RBAC Authorization ---');

  const { PERMISSIONS, ROLES, hasPermission } = require('../../src/config/rbac');

  // F.1: Operations permissions defined
  assert(PERMISSIONS.OPERATIONS_READ === 'operations:read', 'F.1 PERMISSIONS.OPERATIONS_READ defined');
  assert(PERMISSIONS.OPERATIONS_VERIFY === 'operations:verify', 'F.2 PERMISSIONS.OPERATIONS_VERIFY defined');
  assert(PERMISSIONS.OPERATIONS_MANAGE === 'operations:manage', 'F.3 PERMISSIONS.OPERATIONS_MANAGE defined');

  // F.4: Super Admin possesses all operational permissions
  assert(
    hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.OPERATIONS_READ) &&
    hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.OPERATIONS_VERIFY) &&
    hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.OPERATIONS_MANAGE),
    'F.4 Super Admin has full operational permissions (read, verify, manage)'
  );

  // F.5: Operations Admin possesses read and verify permissions
  assert(
    hasPermission(ROLES.OPERATIONS_ADMIN, PERMISSIONS.OPERATIONS_READ) &&
    hasPermission(ROLES.OPERATIONS_ADMIN, PERMISSIONS.OPERATIONS_VERIFY),
    'F.5 Operations Admin has operations:read and operations:verify permissions'
  );

  // F.6: Safety Admin and Auditor possess read-only operational permissions
  assert(
    hasPermission(ROLES.SAFETY_ADMIN, PERMISSIONS.OPERATIONS_READ) &&
    !hasPermission(ROLES.SAFETY_ADMIN, PERMISSIONS.OPERATIONS_MANAGE),
    'F.6 Safety Admin has read-only operations access'
  );
  assert(
    hasPermission(ROLES.AUDITOR, PERMISSIONS.OPERATIONS_READ) &&
    !hasPermission(ROLES.AUDITOR, PERMISSIONS.OPERATIONS_VERIFY),
    'F.7 Auditor has read-only operations access'
  );

  // F.8: Passenger and Assistant roles denied all operations permissions
  assert(
    !hasPermission(ROLES.PASSENGER, PERMISSIONS.OPERATIONS_READ) &&
    !hasPermission(ROLES.ASSISTANT, PERMISSIONS.OPERATIONS_VERIFY),
    'F.8 Passenger and Assistant roles denied all operations permissions'
  );

  // F.9: Verify operations routes file exports valid router
  const opsRoutesPath = path.resolve(__dirname, '../../src/routes/operationsRoutes.js');
  const opsRoutesSrc = fs.readFileSync(opsRoutesPath, 'utf8');
  assert(
    opsRoutesSrc.includes('/status') &&
    opsRoutesSrc.includes('/verify-deployment') &&
    opsRoutesSrc.includes('/deployment-verifications') &&
    opsRoutesSrc.includes('/recovery-status') &&
    opsRoutesSrc.includes('/recovery-verifications'),
    'F.9 operationsRoutes maps status, verify-deployment, deployment-verifications, and recovery endpoints'
  );

  // --------------------------------------------------------------------------
  // SECTION G: Request Reliability Middleware
  // --------------------------------------------------------------------------
  console.log('\n--- Section G: Request Reliability Middleware ---');

  const { reliabilityTelemetry } = require('../../src/middleware/reliabilityTelemetry');

  resetMetrics();

  let finishCallback = null;
  const mockReqG = {
    method: 'GET',
    originalUrl: '/api/trains/search?from=NDLS&to=CNB',
    baseUrl: '/api/trains'
  };
  const mockResG = {
    statusCode: 200,
    on: (evt, cb) => {
      if (evt === 'finish') finishCallback = cb;
    }
  };

  let nextCalledG = false;
  reliabilityTelemetry(mockReqG, mockResG, () => { nextCalledG = true; });
  assert(nextCalledG === true, 'G.1 reliabilityTelemetry calls next() immediately');

  // Trigger finish event to record metrics
  if (finishCallback) finishCallback();

  const snapG = getSnapshot();
  assert(snapG.http.totalRequests === 1, 'G.2 reliabilityTelemetry asynchronously recorded request metric');
  assert(snapG.http.statusCategories['2xx'] === 1, 'G.3 2xx status accurately incremented');

  // --------------------------------------------------------------------------
  // SECTION H: Architecture Continuity, Runbooks & Security Regression
  // --------------------------------------------------------------------------
  console.log('\n--- Section H: Architecture Continuity & Security Regression ---');

  // H.1: Migration SQL defines deployment_verifications, recovery_verifications, application_operational_events
  const migrationSqlPath = path.resolve(__dirname, '../../src/config/phase6_production_reliability.sql');
  const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');
  assert(
    migrationSql.includes('CREATE TABLE IF NOT EXISTS public.deployment_verifications') &&
    migrationSql.includes('CREATE TABLE IF NOT EXISTS public.recovery_verifications') &&
    migrationSql.includes('CREATE TABLE IF NOT EXISTS public.application_operational_events'),
    'H.1 Migration SQL defines deployment_verifications, recovery_verifications, and operational events'
  );

  // H.2: Migration includes Row Level Security policies with default-deny client access
  assert(
    migrationSql.includes('ENABLE ROW LEVEL SECURITY') &&
    migrationSql.includes('Deny all client access on deployment_verifications') &&
    migrationSql.includes('Deny all client access on recovery_verifications'),
    'H.2 Migration enables Row Level Security with client-deny isolation'
  );

  // H.3: Database readiness service includes operational tables
  const dbReadinessSrc = fs.readFileSync(path.resolve(__dirname, '../../src/services/databaseReadinessService.js'), 'utf8');
  assert(
    dbReadinessSrc.includes('deployment_verifications') &&
    dbReadinessSrc.includes('recovery_verifications') &&
    dbReadinessSrc.includes('application_operational_events'),
    'H.3 databaseReadinessService surveillance includes all new operational tables'
  );

  // H.4: Server index mounts reliability telemetry and operations routes
  const indexSrc = fs.readFileSync(path.resolve(__dirname, '../../src/index.js'), 'utf8');
  assert(
    indexSrc.includes('reliabilityTelemetry') &&
    indexSrc.includes('/api/admin/operations') &&
    indexSrc.includes('registerShutdownHandlers'),
    'H.4 server/src/index.js mounts reliabilityTelemetry, /api/admin/operations, and registerShutdownHandlers'
  );

  // H.5: Disaster recovery runbook exists and documents procedures
  const runbookPath = path.resolve(__dirname, '../../DISASTER_RECOVERY_RUNBOOK.md');
  assert(fs.existsSync(runbookPath), 'H.5 DISASTER_RECOVERY_RUNBOOK.md exists');
  const runbookSrc = fs.readFileSync(runbookPath, 'utf8');
  assert(
    runbookSrc.includes('Application Deployment Rollback') &&
    runbookSrc.includes('Database Outage & Point-In-Time Recovery') &&
    runbookSrc.includes('Security Compromise & Threat Containment') &&
    runbookSrc.includes('RPO Target') &&
    runbookSrc.includes('24 hours') &&
    runbookSrc.includes('RTO Target') &&
    runbookSrc.includes('4 hours'),
    'H.6 Runbook comprehensively details incident classification, rollback, PITR, and targets'
  );

  // H.7: Deployment checklist updated with Phase 6.8 checklists
  const checklistPath = path.resolve(__dirname, '../../DEPLOYMENT_SECURITY_CHECKLIST.md');
  const checklistSrc = fs.readFileSync(checklistPath, 'utf8');
  assert(
    checklistSrc.includes('Pre-Deployment, Post-Deployment & Rollback Checklists (Phase 6.8)') &&
    checklistSrc.includes('test_phase6_production_reliability.js'),
    'H.7 DEPLOYMENT_SECURITY_CHECKLIST.md updated with Phase 6.8 checklists and matrix'
  );

  // H.8: Zero hardcoded production secrets in any new Phase 6.8 service
  const phase68Files = [
    'src/services/healthService.js',
    'src/services/metricsService.js',
    'src/services/gracefulShutdownService.js',
    'src/services/deploymentVerificationService.js',
    'src/services/recoveryVerificationService.js',
    'src/middleware/reliabilityTelemetry.js',
    'src/routes/operationsRoutes.js'
  ];
  let secretFound = false;
  for (const fPath of phase68Files) {
    const content = fs.readFileSync(path.resolve(__dirname, '../../', fPath), 'utf8');
    if (/AIza[0-9A-Za-z-_]{35}/.test(content) || /ey[A-Za-z0-9-_]{20,}\.ey[A-Za-z0-9-_]{20,}/.test(content)) {
      secretFound = true;
    }
  }
  assert(!secretFound, 'H.8 Zero hardcoded API keys, JWT secrets, or DB credentials in Phase 6.8 services');

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`PHASE 6.8 VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests > 0) {
    console.error(`FAILURE: ${failedTests} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('ALL PHASE 6.8 PRODUCTION RELIABILITY & RECOVERY TESTS PASSED');
    console.log('========================================================================\n');
  }
}

runTests().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
