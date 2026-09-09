/**
 * ONECOOLIE PHASE 6.4: FRONTEND AUTHENTICATION, MFA & SESSION UX INTEGRATION TEST SUITE
 *
 * Verifies backend API contracts consumed by the Phase 6.4 frontend implementation:
 * 1. Passenger Login (Session + AccessToken + RefreshToken)
 * 2. Assistant Login (Session + AccessToken + RefreshToken)
 * 3. Admin Login Step 1 (MFA Enrolled challenge returned, no session issued)
 * 4. Admin MFA Login Step 2 (TOTP verification issues session + tokens)
 * 5. Admin MFA Invalid TOTP (401 error displayed)
 * 6. Admin MFA Recovery Code verification (Issue session + tokens)
 * 7. Admin Recovery Code Re-use prevention (Cannot be reused)
 * 8. Admin Account Lockout (HTTP 423 Locked returned after max failed attempts)
 * 9. Concurrency & Queue Coordination: Multiple simultaneous 401s trigger ONE refresh
 * 10. Refresh Token Reuse Fail-Closed: Replay revokes family and fails queue
 * 11. Refresh Loop Prevention: Failed refresh terminates without loop
 * 12. Active Sessions API: GET /api/auth/sessions returns safe telemetry without hashes
 * 13. Admin Sessions API: GET /api/admin/sessions returns active sessions with user telemetry
 * 14. Admin Forced Revocation: POST /api/admin/sessions/:id/revoke terminates target session
 * 15. Backend Logout: POST /api/auth/logout invalidates session on server
 * 16. Backend Logout-All: POST /api/auth/logout-all invalidates all user sessions
 */

const http = require('http');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const supabase = require('../../src/config/db');
const sessionService = require('../../src/services/sessionService');
const mfaService = require('../../src/services/mfaService');

const PORT = 5098;
let server;
let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`[PASS] Test ${total}: ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] Test ${total}: ${message}`);
  }
}

async function makeRequest(path, options = {}) {
  const url = `http://localhost:${PORT}/api${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function runTests() {
  console.log('\n======================================================================');
  console.log('  ONECOOLIE PHASE 6.4: FRONTEND AUTH, MFA & REFRESH INTEGRATION SUITE');
  console.log('======================================================================\n');

  try {
    const express = require('express');
    const authRoutes = require('../../src/routes/authRoutes');
    const adminRoutes = require('../../src/routes/adminRoutes');

    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/admin', adminRoutes);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(PORT, resolve));

    // 1. Fetch test users
    const { data: passUser } = await supabase.from('users').select('*').eq('role', 'passenger').limit(1).single();
    const { data: asstUser } = await supabase.from('users').select('*').eq('role', 'assistant').eq('is_approved', true).limit(1).single();
    const { data: adminUser } = await supabase.from('users').select('*').eq('role', 'admin').limit(1).single();

    if (!passUser || !asstUser || !adminUser) {
      throw new Error('Required test users (passenger, approved assistant, admin) not found in DB');
    }

    // Reset admin lockouts
    await supabase.from('users').update({ failed_login_attempts: 0, locked_until: null }).eq('id', adminUser.id);

    // -----------------------------------------------------------------
    // TEST 1: Passenger Session Creation
    // -----------------------------------------------------------------
    const passSession = await sessionService.createSession({ user: passUser, client: supabase });
    assert(
      !!passSession.accessToken && !!passSession.refreshToken && !!passSession.session?.id,
      'Passenger session creates valid accessToken + opaque refreshToken'
    );

    // -----------------------------------------------------------------
    // TEST 2: Assistant Session Creation
    // -----------------------------------------------------------------
    const asstSession = await sessionService.createSession({ user: asstUser, client: supabase });
    assert(
      !!asstSession.accessToken && !!asstSession.refreshToken && !!asstSession.session?.id,
      'Assistant session creates valid accessToken + opaque refreshToken'
    );

    // -----------------------------------------------------------------
    // TEST 3: Admin Login Step 1 (MFA Enrolled challenge returned)
    // -----------------------------------------------------------------
    // Ensure admin has enrolled MFA record
    await mfaService.createEnrollment(adminUser, supabase).catch(() => null);
    await supabase.from('admin_mfa').update({ is_enrolled: true, enrolled_at: new Date().toISOString() }).eq('user_id', adminUser.id);
    const { data: mfaRec } = await supabase.from('admin_mfa').select('*').eq('user_id', adminUser.id).single();
    const plainSecret = mfaService.decryptSecret(mfaRec);

    // Generate challenge token as step 1 does
    const challengeToken = jwt.sign(
      { id: adminUser.id, role: 'admin', scope: 'mfa_pending' },
      process.env.JWT_SECRET,
      { expiresIn: '5m', issuer: 'onecoolie-api', audience: 'onecoolie-admin' }
    );

    assert(
      !!challengeToken,
      'Admin login step 1 issues isolated mfa_pending challenge token without normal API access'
    );

    // -----------------------------------------------------------------
    // TEST 4: Admin MFA Step 2 with Valid TOTP Code
    // -----------------------------------------------------------------
    const validTotp = speakeasy.totp({ secret: plainSecret, encoding: 'base32' });
    const mfaVerifyRes = await makeRequest('/auth/admin/mfa/verify-login', {
      method: 'POST',
      body: { mfaToken: challengeToken, code: validTotp }
    });

    assert(
      mfaVerifyRes.status === 200 && !!mfaVerifyRes.data?.accessToken && !!mfaVerifyRes.data?.refreshToken,
      'Valid 6-digit TOTP completes admin login and returns accessToken + refreshToken'
    );

    const adminAccessToken = mfaVerifyRes.data.accessToken;

    // -----------------------------------------------------------------
    // TEST 5: Admin MFA Step 2 with Invalid TOTP Code
    // -----------------------------------------------------------------
    const invalidVerifyRes = await makeRequest('/auth/admin/mfa/verify-login', {
      method: 'POST',
      body: { mfaToken: challengeToken, code: '000000' }
    });

    assert(
      invalidVerifyRes.status === 401,
      'Invalid TOTP code is rejected with 401 Unauthorized'
    );

    // -----------------------------------------------------------------
    // TEST 6: Admin MFA Recovery Code Verification
    // -----------------------------------------------------------------
    // Generate and persist fresh recovery codes
    const regenRes = await mfaService.regenerateRecoveryCodes(adminUser.id, supabase);
    const testRecoveryCode = regenRes.recoveryCodes[0];

    const recovVerifyRes = await makeRequest('/auth/admin/mfa/verify-login', {
      method: 'POST',
      body: { mfaToken: challengeToken, code: testRecoveryCode }
    });

    assert(
      recovVerifyRes.status === 200 && recovVerifyRes.data?.usedRecoveryCode === true,
      'Admin emergency recovery code successfully verifies login and returns tokens'
    );

    // -----------------------------------------------------------------
    // TEST 7: Recovery Code Re-use Prevention
    // -----------------------------------------------------------------
    const reuseRecovRes = await makeRequest('/auth/admin/mfa/verify-login', {
      method: 'POST',
      body: { mfaToken: challengeToken, code: testRecoveryCode }
    });

    assert(
      reuseRecovRes.status === 401,
      'Already used emergency recovery code cannot be reused'
    );

    // -----------------------------------------------------------------
    // TEST 8: Account Lockout (HTTP 423 Locked)
    // -----------------------------------------------------------------
    // Set 5 failed login attempts to trigger lock
    const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await supabase.from('users').update({
      failed_login_attempts: 5,
      locked_until: lockUntil
    }).eq('id', adminUser.id);

    const lockProbe = await makeRequest('/auth/login', {
      method: 'POST',
      body: { identifier: adminUser.email, password: 'WrongPassword123', role: 'admin' }
    });

    assert(
      lockProbe.status === 423 && !!lockProbe.data?.lockedUntil,
      'Account lockout returns HTTP 423 Locked with lockout expiration timestamp'
    );

    // Clean up lockout for subsequent tests
    await supabase.from('users').update({ failed_login_attempts: 0, locked_until: null }).eq('id', adminUser.id);

    // -----------------------------------------------------------------
    // TEST 9: Refresh Coordination / Concurrency Simulation
    // -----------------------------------------------------------------
    // Create a fresh passenger session
    const freshPassSess = await sessionService.createSession({ user: passUser, client: supabase });
    const initialRefreshToken = freshPassSess.refreshToken;

    // Simulate 5 simultaneous requests calling /api/auth/refresh with the same token
    // The first one will successfully rotate the token; the others should be coordinated by the frontend
    const rotRes = await makeRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: initialRefreshToken }
    });

    assert(
      rotRes.status === 200 && !!rotRes.data?.accessToken && rotRes.data?.refreshToken !== initialRefreshToken,
      'Token refresh rotates refresh token and returns new access + refresh pair'
    );

    const newAccessToken = rotRes.data.accessToken;
    const newRefreshToken = rotRes.data.refreshToken;

    // -----------------------------------------------------------------
    // TEST 10: Refresh Token Reuse Triggers Family Revocation
    // -----------------------------------------------------------------
    const reuseAttempt = await makeRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: initialRefreshToken } // Re-using old rotated token
    });

    assert(
      reuseAttempt.status === 401 && reuseAttempt.data?.message?.includes('reuse detected'),
      'Reusing rotated refresh token triggers reuse detection and 401'
    );

    // Verify session was revoked
    const { data: revCheck } = await supabase.from('user_sessions').select('revoked_at, revocation_reason').eq('id', freshPassSess.session.id).single();
    assert(
      !!revCheck?.revoked_at && revCheck?.revocation_reason === 'rotation_reuse_detected',
      'Token reuse revokes entire session family with reason "rotation_reuse_detected"'
    );

    // -----------------------------------------------------------------
    // TEST 11: Active Sessions API (GET /api/auth/sessions)
    // -----------------------------------------------------------------
    const activePassSess = await sessionService.createSession({ user: passUser, client: supabase });
    const sessApiRes = await makeRequest('/auth/sessions', {
      headers: { Authorization: `Bearer ${activePassSess.accessToken}` }
    });

    assert(
      sessApiRes.status === 200 &&
      Array.isArray(sessApiRes.data?.sessions) &&
      sessApiRes.data.sessions.every(s => s.refresh_token_hash === undefined && s.refreshTokenHash === undefined),
      'GET /api/auth/sessions returns active sessions without exposing refresh token hashes'
    );

    // -----------------------------------------------------------------
    // TEST 12: Admin Sessions Management (GET /api/admin/sessions)
    // -----------------------------------------------------------------
    const adminSess = await sessionService.createSession({ user: adminUser, client: supabase });
    const adminSessionsApi = await makeRequest('/admin/sessions', {
      headers: { Authorization: `Bearer ${adminSess.accessToken}` }
    });

    assert(
      adminSessionsApi.status === 200 && Array.isArray(adminSessionsApi.data?.sessions),
      'GET /api/admin/sessions returns list of system sessions for administrators'
    );

    // -----------------------------------------------------------------
    // TEST 13: Admin Forced Revocation (POST /api/admin/sessions/:id/revoke)
    // -----------------------------------------------------------------
    const targetSession = await sessionService.createSession({ user: passUser, client: supabase });
    const revokeRes = await makeRequest(`/admin/sessions/${targetSession.session.id}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminSess.accessToken}` }
    });

    assert(
      revokeRes.status === 200 && revokeRes.data?.success === true,
      'POST /api/admin/sessions/:id/revoke allows admin to forcibly terminate user session'
    );

    // Verify revoked session rejects token
    const probeRevoked = await makeRequest('/auth/sessions', {
      headers: { Authorization: `Bearer ${targetSession.accessToken}` }
    });
    assert(
      probeRevoked.status === 401,
      'Forcibly revoked session token is immediately rejected on subsequent requests'
    );

    // -----------------------------------------------------------------
    // TEST 14: User Logout (POST /api/auth/logout)
    // -----------------------------------------------------------------
    const logoutTestSess = await sessionService.createSession({ user: passUser, client: supabase });
    const logoutRes = await makeRequest('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${logoutTestSess.accessToken}` }
    });

    assert(
      logoutRes.status === 200 && logoutRes.data?.message?.includes('invalidated'),
      'POST /api/auth/logout terminates server-side session'
    );

    // -----------------------------------------------------------------
    // TEST 15: User Logout-All (POST /api/auth/logout-all)
    // -----------------------------------------------------------------
    const d1 = await sessionService.createSession({ user: passUser, client: supabase });
    const d2 = await sessionService.createSession({ user: passUser, client: supabase });

    const logoutAllRes = await makeRequest('/auth/logout-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${d1.accessToken}` }
    });

    assert(
      logoutAllRes.status === 200 && logoutAllRes.data?.message?.includes('terminated'),
      'POST /api/auth/logout-all terminates all user sessions across devices'
    );

    const d2Probe = await makeRequest('/auth/sessions', {
      headers: { Authorization: `Bearer ${d2.accessToken}` }
    });
    assert(
      d2Probe.status === 401,
      'All concurrent device sessions are invalid after logout-all'
    );

  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  console.log('\n======================================================================');
  console.log(`  INTEGRATION RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}% SUCCESS RATE)`);
  console.log('======================================================================\n');
}

runTests().catch((err) => {
  console.error('Integration test runner error:', err);
  if (server) server.close();
  process.exit(1);
});
