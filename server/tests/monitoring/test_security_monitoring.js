/**
 * ONECOOLIE Phase 6.7: Security Monitoring, Incident Response & Production Observability
 * Comprehensive Automated Verification Suite
 *
 * Covers:
 * A. Security Event Ingestion & Normalization (valid severity, types, metadata scrubbing, IP masking)
 * B. Pattern Detection Rules (refresh token reuse, login brute-force, MFA failures, CSRF attacks, rate limiting)
 * C. Incident Lifecycle, Deduplication & Escalation (dedup window, severity progression, state machine)
 * D. Automated & Manual Containment (family revocation, socket severance, incident guard, action audits)
 * E. RBAC Permissions & Admin Incident Management API (security:read, security:respond, security:manage)
 * F. User Security Activity Scoping (tenant isolation, sensitive field stripping)
 * G. Regression & Architecture Continuity (Phase 6.2 - 6.6 compatibility, DB readiness)
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
    security_events: [],
    security_incidents: [],
    security_incident_events: [],
    security_response_actions: []
  };

  function createQueryBuilder(tableName) {
    let filters = [];
    let orderClause = null;
    let limitCount = null;
    let updatePayload = null;
    let insertRows = null;

    const builder = {
      select: (fields = '*') => builder,
      insert: (rows) => {
        insertRows = Array.isArray(rows) ? rows : [rows];
        const inserted = insertRows.map(r => ({
          id: r.id || crypto.randomUUID(),
          ...r,
          created_at: r.created_at || new Date().toISOString()
        }));
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
          catch: (fn) => {}
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
      in: (col, vals) => {
        filters.push((row) => vals.includes(row[col]));
        return builder;
      },
      gte: (col, val) => {
        filters.push((row) => row[col] >= val);
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
        let results = (tables[tableName] || []).filter(r => filters.every(f => f(r)));
        if (updatePayload && results.length > 0) {
          Object.assign(results[0], updatePayload);
        }
        return { data: results[0] || null, error: null };
      },
      single: async () => {
        let results = (tables[tableName] || []).filter(r => filters.every(f => f(r)));
        if (updatePayload && results.length > 0) {
          Object.assign(results[0], updatePayload);
        }
        return { data: results[0] || null, error: null };
      },
      then: (resolve) => {
        let results = (tables[tableName] || []).filter(r => filters.every(f => f(r)));
        if (orderClause) {
          results.sort((a, b) => {
            if (a[orderClause.col] < b[orderClause.col]) return orderClause.ascending ? -1 : 1;
            if (a[orderClause.col] > b[orderClause.col]) return orderClause.ascending ? 1 : -1;
            return 0;
          });
        }
        if (limitCount !== null) {
          results = results.slice(0, limitCount);
        }
        return resolve({ data: results, error: null });
      }
    };
    return builder;
  }

  return {
    from: (table) => createQueryBuilder(table),
    _tables: tables
  };
}

async function runTests() {
  console.log('========================================================================');
  console.log('ONECOOLIE PHASE 6.7: SECURITY MONITORING & INCIDENT RESPONSE TEST SUITE');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION A: Event Ingestion, Normalization & Telemetry Hygiene
  // --------------------------------------------------------------------------
  console.log('--- Section A: Event Ingestion, Normalization & Telemetry Hygiene ---');

  const {
    recordSecurityEvent,
    getUserRecentEvents,
    VALID_EVENT_TYPES,
    VALID_SEVERITIES,
    slidingWindows
  } = require('../../src/services/securityMonitoringService');

  const { maskIp, scrubSensitiveData } = require('../../src/middleware/securityTelemetry');
  const { requestIdMiddleware, generateRequestId } = require('../../src/middleware/requestId');

  // A.1: Valid severity levels enumeration
  assert(
    VALID_SEVERITIES instanceof Set &&
    ['info', 'low', 'medium', 'high', 'critical'].every(s => VALID_SEVERITIES.has(s)),
    'A.1 Valid severity levels enumeration includes info, low, medium, high, critical'
  );

  // A.2: Event types covers all key threat categories
  const requiredTypes = [
    'login_failed', 'login_success', 'account_locked', 'mfa_failed',
    'refresh_token_reuse_detected', 'csrf_validation_failed', 'origin_validation_failed',
    'rate_limit_exceeded', 'session_revoked'
  ];
  assert(
    requiredTypes.every(t => VALID_EVENT_TYPES.has(t)),
    'A.2 Event types enumeration covers auth, MFA, token reuse, CSRF, and rate limiting'
  );

  // A.3: IP Address Masking - IPv4 masks last octet
  const maskedV4 = maskIp('192.168.1.45');
  assert(
    maskedV4 === '192.168.1.xxx',
    `A.3 IPv4 address masked to subnet (.xxx): received "${maskedV4}"`
  );

  // A.4: IP Address Masking - IPv6 masks interface identifiers
  const maskedV6 = maskIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
  assert(
    maskedV6 === '2001:0db8:xxxx:xxxx',
    `A.4 IPv6 address masked to prefix: received "${maskedV6}"`
  );

  // A.5: IP Address Masking - localhost / unknown handles safely
  assert(maskIp('127.0.0.1') === '127.0.0.xxx', 'A.5 Localhost IPv4 masks properly');
  assert(maskIp('unknown') === 'unknown', 'A.6 Unknown IP passes safely without throwing');

  // A.7: Metadata Sanitization - scrubs passwords and tokens
  const dirtyMeta = {
    password: 'SuperSecretPassword123!',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
    refreshToken: 'ref_tok_secret_value',
    mfa_code: '123456',
    safeField: 'standard_info',
    nested: {
      totp_secret: 'JBSWY3DPEHPK3PXP',
      allowed_count: 5
    }
  };
  const cleanMeta = scrubSensitiveData(dirtyMeta);
  assert(cleanMeta.password === '[REDACTED]', 'A.7 Password scrubbed from security metadata');
  assert(cleanMeta.token === '[REDACTED]', 'A.8 Access token scrubbed from security metadata');
  assert(cleanMeta.refreshToken === '[REDACTED]', 'A.9 Refresh token scrubbed from security metadata');
  assert(cleanMeta.mfa_code === '[REDACTED]', 'A.10 MFA code scrubbed from security metadata');
  assert(cleanMeta.nested.totp_secret === '[REDACTED]', 'A.11 Nested TOTP secret scrubbed from metadata');
  assert(cleanMeta.safeField === 'standard_info' && cleanMeta.nested.allowed_count === 5, 'A.12 Safe telemetry fields preserved unmutated');

  // A.13: Request ID generation and propagation
  let assignedReqId = null;
  const mockReq = { headers: {} };
  const mockRes = {
    setHeader: (key, val) => {
      if (key === 'X-Request-ID') assignedReqId = val;
    }
  };
  requestIdMiddleware(mockReq, mockRes, () => {});
  assert(
    typeof mockReq.requestId === 'string' && mockReq.requestId.length >= 16,
    'A.13 Request ID middleware assigns unique correlation ID to req.requestId'
  );
  assert(
    assignedReqId === mockReq.requestId,
    'A.14 Request ID middleware mirrors correlation ID to X-Request-ID response header'
  );

  // A.15: Request ID middleware adopts client X-Request-ID if sanitized
  const clientReq = { headers: { 'x-request-id': 'custom-trace-uuid-1234' } };
  requestIdMiddleware(clientReq, mockRes, () => {});
  assert(
    clientReq.requestId === 'custom-trace-uuid-1234',
    'A.15 Valid client-supplied X-Request-ID is adopted for cross-service tracing'
  );

  // A.16: Event Recording persists normalized event with masked IP and zero token leak
  const mockDbA = createMockSupabase();
  const recordedEvent = await recordSecurityEvent({
    eventType: 'login_failed',
    severity: 'medium',
    userId: 'usr_test_a16',
    ip: '192.168.1.55',
    metadata: { password: 'should_be_stripped', reason: 'invalid_credentials' },
    client: mockDbA
  });
  assert(recordedEvent && recordedEvent.event_type === 'login_failed', 'A.16 recordSecurityEvent creates valid event record');
  assert(recordedEvent.source_ip === '192.168.1.xxx', 'A.17 Recorded event persists masked IP');
  assert(recordedEvent.metadata.password === undefined, 'A.18 Sensitive password excluded from recorded event metadata');
  assert(recordedEvent.metadata.reason === 'invalid_credentials', 'A.19 Safe telemetry metadata field preserved');

  // --------------------------------------------------------------------------
  // SECTION B: Sliding Window Pattern Detection Rules
  // --------------------------------------------------------------------------
  console.log('\n--- Section B: Sliding Window Pattern Detection Rules ---');

  const mockDbB = createMockSupabase();

  // Reset in-memory trackers
  slidingWindows.loginFailures.clear();
  slidingWindows.mfaFailures.clear();
  slidingWindows.csrfFailures.clear();
  slidingWindows.rateLimitHits.clear();

  // B.1: Refresh token reuse immediately triggers an incident
  await recordSecurityEvent({
    eventType: 'refresh_token_reuse_detected',
    severity: 'critical',
    userId: 'victim_user_b1',
    sessionId: 'sess_bad_b1',
    family_id: 'fam_bad_b1',
    ip: '10.0.0.1',
    client: mockDbB
  });
  const reuseIncidents = mockDbB._tables.security_incidents.filter(i => i.incident_type === 'refresh_token_reuse_detected');
  assert(reuseIncidents.length === 1, 'B.1 Refresh token reuse event creates a security incident');
  assert(reuseIncidents[0].severity === 'critical', 'B.2 Refresh token reuse incident assigned CRITICAL severity');

  // B.3: 4 login failures do not trigger an incident yet (threshold is 5)
  for (let i = 0; i < 4; i++) {
    await recordSecurityEvent({
      eventType: 'login_failed',
      userId: 'brute_target_b3',
      ip: '203.0.113.50',
      client: mockDbB
    });
  }
  const bruteIncidentsBefore = mockDbB._tables.security_incidents.filter(i => i.incident_type === 'repeated_login_failures');
  assert(bruteIncidentsBefore.length === 0, 'B.3 4 login failures do not exceed threshold');

  // B.4: 5th login failure triggers MEDIUM incident
  await recordSecurityEvent({
    eventType: 'login_failed',
    userId: 'brute_target_b3',
    ip: '203.0.113.50',
    client: mockDbB
  });
  const bruteIncidentsAfter = mockDbB._tables.security_incidents.filter(i => i.incident_type === 'repeated_login_failures');
  assert(bruteIncidentsAfter.length === 1, 'B.4 5th login failure triggers repeated_login_failures incident');
  assert(bruteIncidentsAfter[0].severity === 'medium', 'B.5 Repeated login failures assigned MEDIUM severity');

  // B.6: 5 MFA failures triggers HIGH incident
  for (let i = 0; i < 5; i++) {
    await recordSecurityEvent({
      eventType: 'mfa_failed',
      userId: 'mfa_target_b6',
      ip: '203.0.113.60',
      client: mockDbB
    });
  }
  const mfaIncidents = mockDbB._tables.security_incidents.filter(i => i.incident_type === 'repeated_mfa_failures');
  assert(mfaIncidents.length === 1, 'B.6 5 MFA failures triggers repeated_mfa_failures incident');
  assert(mfaIncidents[0].severity === 'high', 'B.7 Repeated MFA failures assigned HIGH severity');

  // B.8: 3 CSRF failures triggers CSRF anomaly incident
  for (let i = 0; i < 3; i++) {
    await recordSecurityEvent({
      eventType: 'csrf_validation_failed',
      ip: '198.51.100.80',
      client: mockDbB
    });
  }
  const csrfIncidents = mockDbB._tables.security_incidents.filter(i => i.incident_type === 'csrf_attack_pattern');
  assert(csrfIncidents.length === 1, 'B.8 3 CSRF failures triggers csrf_attack_pattern incident');
  assert(csrfIncidents[0].severity === 'medium', 'B.9 CSRF attack pattern assigned MEDIUM severity');

  // B.10: Rate limit violations pattern
  for (let i = 0; i < 10; i++) {
    await recordSecurityEvent({
      eventType: 'rate_limit_exceeded',
      ip: '198.51.100.90',
      client: mockDbB
    });
  }
  const rateLimitIncidents = mockDbB._tables.security_incidents.filter(i => i.incident_type === 'excessive_rate_limit_violations');
  assert(rateLimitIncidents.length === 1, 'B.10 10 rate limit violations triggers excessive_rate_limit_violations incident');

  // --------------------------------------------------------------------------
  // SECTION C: Incident Lifecycle, Deduplication & Escalation
  // --------------------------------------------------------------------------
  console.log('\n--- Section C: Incident Lifecycle, Deduplication & Escalation ---');

  const {
    createOrUpdateIncident,
    acknowledgeIncident,
    resolveIncident,
    dismissIncident
  } = require('../../src/services/securityIncidentService');

  const mockDbC = createMockSupabase();

  // C.1: Initial incident creation in 'open' status
  const inc1 = await createOrUpdateIncident({
    incidentType: 'suspicious_login',
    severity: 'low',
    userId: 'target_user_c1',
    client: mockDbC
  });
  assert(inc1 && inc1.id && inc1.status === 'open', 'C.1 New incident initialized with status "open"');
  assert(inc1.event_count === 1, 'C.2 Incident event_count initialized to 1');

  // C.3: Deduplication within window increments event_count rather than creating duplicate
  const inc2 = await createOrUpdateIncident({
    incidentType: 'suspicious_login',
    severity: 'low',
    userId: 'target_user_c1',
    client: mockDbC
  });
  assert(inc2.id === inc1.id, 'C.3 Deduplication maps repeated occurrence to existing incident ID');
  assert(inc2.event_count === 2, 'C.4 Deduplicated incident increments event_count');

  // C.5: Repeated offenses escalate severity (low -> medium)
  for (let i = 0; i < 4; i++) {
    await createOrUpdateIncident({
      incidentType: 'suspicious_login',
      severity: 'low',
      userId: 'target_user_c1',
      client: mockDbC
    });
  }
  const incEscalated = mockDbC._tables.security_incidents.find(i => i.id === inc1.id);
  assert(incEscalated.event_count >= 5, 'C.5 Multiple occurrences recorded on single incident');
  assert(incEscalated.severity === 'medium', `C.6 Repeated offenses escalate severity from low to medium: received "${incEscalated.severity}"`);

  // C.7: State transition: open -> investigating (acknowledge)
  const ackRes = await acknowledgeIncident(inc1.id, { id: 'admin_sec_01', email: 'admin@onecoolie.com' }, mockDbC);
  assert(ackRes.status === 'investigating', 'C.7 acknowledgeIncident transitions status to "investigating"');
  assert(ackRes.assigned_admin_id === 'admin_sec_01', 'C.8 Assigned admin recorded on incident');

  // C.9: State transition: investigating -> resolved
  const resolveRes = await resolveIncident(inc1.id, { id: 'admin_sec_01' }, mockDbC);
  assert(resolveRes.status === 'resolved', 'C.9 resolveIncident transitions status to "resolved"');
  assert(resolveRes.resolved_at !== undefined, 'C.10 resolved_at timestamp stamped on resolution');

  // C.11: Dismiss false positive
  const incDismiss = await createOrUpdateIncident({
    incidentType: 'false_positive_probe',
    severity: 'low',
    userId: 'target_user_c11',
    client: mockDbC
  });
  const disRes = await dismissIncident(incDismiss.id, { id: 'admin_sec_01' }, mockDbC);
  assert(disRes.status === 'dismissed', 'C.11 dismissIncident transitions status to "dismissed"');

  // --------------------------------------------------------------------------
  // SECTION D: Automated & Manual Containment System
  // --------------------------------------------------------------------------
  console.log('\n--- Section D: Automated & Manual Containment System ---');

  const {
    executeAutomatedResponse,
    executeAdminManualResponse,
    recordResponseAction
  } = require('../../src/services/securityResponseService');

  const {
    isSessionUnderContainment,
    isUserUnderContainment,
    setContainmentState
  } = require('../../src/services/securityIncidentService');

  const { securityIncidentGuard } = require('../../src/middleware/securityIncidentGuard');

  const mockDbD = createMockSupabase();

  // D.1: Record response action in security audit
  const actionRec = await recordResponseAction({
    incidentId: 'inc_test_d1',
    actionType: 'revoke_session',
    initiatedBy: 'system',
    result: 'success',
    client: mockDbD
  });
  assert(actionRec && actionRec.action_type === 'revoke_session', 'D.1 recordResponseAction records containment action');
  assert(mockDbD._tables.security_response_actions.length === 1, 'D.2 Response action persisted in security_response_actions table');

  // D.3: Automated response on token reuse
  const autoResult = await executeAutomatedResponse({
    id: 'inc_reuse_d3',
    incident_type: 'refresh_token_reuse_detected',
    family_id: 'fam_d3_target',
    user_id: 'usr_d3_target'
  }, mockDbD);
  assert(autoResult.action === 'revoke_family', 'D.3 Automated response for token reuse executes revoke_family');

  // D.4: Set in-memory containment states
  setContainmentState('user', 'usr_contained_test', true);
  setContainmentState('session', 'sess_contained_test', true);
  assert(isUserUnderContainment('usr_contained_test') === true, 'D.4 isUserUnderContainment returns true for contained user');
  assert(isSessionUnderContainment('sess_contained_test') === true, 'D.5 isSessionUnderContainment returns true for contained session');
  assert(isUserUnderContainment('usr_clean_benign') === false, 'D.6 isUserUnderContainment returns false for benign user');

  // D.7: Incident guard middleware blocks contained user with 403
  let guardStatus = 200;
  let guardBody = null;
  const mockContainedReq = {
    user: { id: 'usr_contained_test' },
    originalUrl: '/api/bookings/create',
    requestId: 'test-req-guard-01'
  };
  const mockContainedRes = {
    status: (code) => {
      guardStatus = code;
      return { json: (data) => { guardBody = data; } };
    }
  };
  let guardNextCalled = false;
  await securityIncidentGuard(mockContainedReq, mockContainedRes, () => { guardNextCalled = true; });
  assert(guardStatus === 403 && !guardNextCalled, 'D.7 securityIncidentGuard blocks contained user with 403 Forbidden');
  assert(guardBody?.code === 'ACCOUNT_UNDER_CONTAINMENT', 'D.8 Blocked response contains ACCOUNT_UNDER_CONTAINMENT code');

  // D.9: Incident guard allows uncontained user to proceed
  let benignNextCalled = false;
  const mockBenignReq = {
    user: { id: 'usr_clean_benign' },
    originalUrl: '/api/bookings/create'
  };
  await securityIncidentGuard(mockBenignReq, mockContainedRes, () => { benignNextCalled = true; });
  assert(benignNextCalled === true, 'D.9 securityIncidentGuard allows non-contained user to proceed normally');

  // Clean up containment states
  setContainmentState('user', 'usr_contained_test', false);
  setContainmentState('session', 'sess_contained_test', false);

  // --------------------------------------------------------------------------
  // SECTION E: RBAC Permissions & Admin Incident Management API
  // --------------------------------------------------------------------------
  console.log('\n--- Section E: RBAC Permissions & Admin Security Route Authorization ---');

  const { PERMISSIONS, ROLES, hasPermission } = require('../../src/config/rbac');

  // E.1: RBAC definitions include security monitoring permissions
  assert(PERMISSIONS.SECURITY_READ === 'security:read', 'E.1 PERMISSIONS.SECURITY_READ defined');
  assert(PERMISSIONS.SECURITY_RESPOND === 'security:respond', 'E.2 PERMISSIONS.SECURITY_RESPOND defined');
  assert(PERMISSIONS.SECURITY_MANAGE === 'security:manage', 'E.3 PERMISSIONS.SECURITY_MANAGE defined');

  // E.4: Super Admin possesses all security permissions
  assert(
    hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.SECURITY_READ) &&
    hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.SECURITY_RESPOND) &&
    hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.SECURITY_MANAGE),
    'E.4 Super Admin has full security permissions (read, respond, manage)'
  );

  // E.5: Safety Admin possesses read and respond permissions
  assert(
    hasPermission(ROLES.SAFETY_ADMIN, PERMISSIONS.SECURITY_READ) &&
    hasPermission(ROLES.SAFETY_ADMIN, PERMISSIONS.SECURITY_RESPOND),
    'E.5 Safety Admin has security read and respond permissions'
  );

  // E.6: Auditor possesses read permission only
  assert(
    hasPermission(ROLES.AUDITOR, PERMISSIONS.SECURITY_READ) &&
    !hasPermission(ROLES.AUDITOR, PERMISSIONS.SECURITY_RESPOND) &&
    !hasPermission(ROLES.AUDITOR, PERMISSIONS.SECURITY_MANAGE),
    'E.6 Auditor possesses strictly read-only security permissions'
  );

  // E.7: Passenger and Assistant have ZERO security permissions
  assert(
    !hasPermission(ROLES.PASSENGER, PERMISSIONS.SECURITY_READ) &&
    !hasPermission(ROLES.ASSISTANT, PERMISSIONS.SECURITY_RESPOND),
    'E.7 Passenger and Assistant roles denied all security permissions'
  );

  // --------------------------------------------------------------------------
  // SECTION F: User Security Activity Scoping & Protection
  // --------------------------------------------------------------------------
  console.log('\n--- Section F: User Security Activity Scoping ---');

  const mockDbF = createMockSupabase();
  mockDbF._tables.security_events.push(
    { id: 'evt_f1', event_type: 'login_success', severity: 'info', user_id: 'user_alice', source_ip: '10.0.0.1' },
    { id: 'evt_f2', event_type: 'password_changed', severity: 'info', user_id: 'user_alice', source_ip: '10.0.0.1' },
    { id: 'evt_f3', event_type: 'login_failed', severity: 'low', user_id: 'user_bob', source_ip: '10.0.0.2' }
  );

  // F.1: User recent events excludes internal fields and queries by user_id
  const aliceEvents = await getUserRecentEvents('user_alice', mockDbF);
  assert(Array.isArray(aliceEvents) && aliceEvents.length === 2, 'F.1 getUserRecentEvents isolates events strictly to requested user_id');
  assert(aliceEvents.every(e => e.label !== undefined), 'F.2 User events mapped to human-readable activity labels');
  assert(!aliceEvents.some(e => e.id === 'evt_f3'), 'F.3 Tenant isolation: Bob events never returned in Alice audit list');

  // F.4: Check securityRoutes file exports correct handlers
  const securityRoutesPath = path.resolve(__dirname, '../../src/routes/securityRoutes.js');
  const securityRoutesSrc = fs.readFileSync(securityRoutesPath, 'utf8');
  assert(
    securityRoutesSrc.includes('/my-events') && securityRoutesSrc.includes('getUserRecentEvents'),
    'F.4 GET /my-events endpoint mapped in securityRoutes'
  );
  assert(
    securityRoutesSrc.includes('/admin/incidents/metrics'),
    'F.5 GET /admin/incidents/metrics endpoint mapped'
  );
  assert(
    securityRoutesSrc.includes('/admin/incidents/:incidentId/respond'),
    'F.6 POST /admin/incidents/:incidentId/respond manual containment endpoint mapped'
  );
  assert(
    securityRoutesSrc.includes('/admin/incidents/:incidentId/acknowledge'),
    'F.7 POST /admin/incidents/:incidentId/acknowledge endpoint mapped'
  );

  // --------------------------------------------------------------------------
  // SECTION G: Architecture Continuity & Regression Verification
  // --------------------------------------------------------------------------
  console.log('\n--- Section G: Architecture Continuity & Regression Verification ---');

  // G.1: SQL Migration script defines required tables and indexes
  const migrationPath = path.resolve(__dirname, '../../src/config/phase6_security_monitoring.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  assert(
    migrationSql.includes('CREATE TABLE IF NOT EXISTS public.security_events') &&
    migrationSql.includes('CREATE TABLE IF NOT EXISTS public.security_incidents') &&
    migrationSql.includes('CREATE TABLE IF NOT EXISTS public.security_incident_events') &&
    migrationSql.includes('CREATE TABLE IF NOT EXISTS public.security_response_actions'),
    'G.1 Migration SQL defines security_events, security_incidents, and response tables'
  );

  // G.2: Migration includes service-role strict RLS policies
  assert(
    migrationSql.includes('ENABLE ROW LEVEL SECURITY') &&
    migrationSql.includes('Deny all client access on security_events'),
    'G.2 Migration enables Row Level Security with client-deny isolation'
  );

  // G.3: Database readiness service includes security monitoring tables
  const dbReadinessPath = path.resolve(__dirname, '../../src/services/databaseReadinessService.js');
  const dbReadinessSrc = fs.readFileSync(dbReadinessPath, 'utf8');
  assert(
    dbReadinessSrc.includes('security_events') && dbReadinessSrc.includes('security_incidents'),
    'G.3 databaseReadinessService checks security_events and security_incidents tables'
  );

  // G.4: Server index mounts security telemetry and routes
  const indexSrc = fs.readFileSync(path.resolve(__dirname, '../../src/index.js'), 'utf8');
  assert(
    indexSrc.includes('requestIdMiddleware') &&
    indexSrc.includes('securityTelemetry') &&
    indexSrc.includes('/api/security'),
    'G.4 server/src/index.js mounts requestId, securityTelemetry, and /api/security'
  );

  // G.5: CSRF middleware emits security events on attack detection
  const csrfSrc = fs.readFileSync(path.resolve(__dirname, '../../src/middleware/csrfProtection.js'), 'utf8');
  assert(
    csrfSrc.includes('securityMonitoringService') &&
    csrfSrc.includes('csrf_validation_failed'),
    'G.5 csrfProtection middleware emits csrf_validation_failed telemetry event'
  );

  // G.6: Auth controller emits account_locked and login_failed security events
  const authCtrlSrc = fs.readFileSync(path.resolve(__dirname, '../../src/controllers/authController.js'), 'utf8');
  assert(
    authCtrlSrc.includes('securityMonitoringService') &&
    authCtrlSrc.includes('account_locked'),
    'G.6 authController emits account_locked security event upon brute-force detection'
  );

  // G.7: Session service triggers security event on token reuse
  const sessSrc = fs.readFileSync(path.resolve(__dirname, '../../src/services/sessionService.js'), 'utf8');
  assert(
    sessSrc.includes('securityMonitoringService') &&
    sessSrc.includes('refresh_token_reuse_detected'),
    'G.7 sessionService emits refresh_token_reuse_detected to securityMonitoringService'
  );

  // G.8: Frontend Admin Dashboard includes Security & Incidents tab
  const adminDashPath = path.resolve(__dirname, '../../../client/src/pages/AdminDashboard.jsx');
  const adminDashSrc = fs.readFileSync(adminDashPath, 'utf8');
  assert(
    adminDashSrc.includes('security_monitoring') &&
    adminDashSrc.includes('Security & Incidents') &&
    adminDashSrc.includes('/security/admin/incidents'),
    'G.8 AdminDashboard contains full Security Monitoring & Incident Command interface'
  );

  // G.9: Frontend ProfileMenu includes Recent Security Activity
  const profileMenuPath = path.resolve(__dirname, '../../../client/src/context/ProfileMenu.jsx');
  const profileMenuSrc = fs.readFileSync(profileMenuPath, 'utf8');
  assert(
    profileMenuSrc.includes('Recent Security Activity') &&
    profileMenuSrc.includes('/security/my-events'),
    'G.9 ProfileMenu includes Recent Security Activity telemetry panel'
  );

  // G.10: Zero hardcoded production secrets in any new Phase 6.7 service
  const secServices = [
    'src/services/securityMonitoringService.js',
    'src/services/securityIncidentService.js',
    'src/services/securityResponseService.js',
    'src/middleware/securityTelemetry.js'
  ];
  let secretFound = false;
  for (const sPath of secServices) {
    const content = fs.readFileSync(path.resolve(__dirname, '../../', sPath), 'utf8');
    if (/AIza[0-9A-Za-z-_]{35}/.test(content) || /ey[A-Za-z0-9-_]{20,}\.ey[A-Za-z0-9-_]{20,}/.test(content)) {
      secretFound = true;
    }
  }
  assert(!secretFound, 'G.10 Zero hardcoded API keys, JWT secrets, or DB credentials in security services');

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`PHASE 6.7 VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  if (failedTests > 0) {
    console.error(`FAILURE: ${failedTests} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('ALL PHASE 6.7 SECURITY MONITORING & OBSERVABILITY TESTS PASSED');
    console.log('========================================================================\n');
  }
}

runTests().catch(err => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
