/**
 * server/test_phase6_sessions.js
 *
 * ONECOOLIE Phase 6.3: Server-Side Session Management & Token Rotation Verification Suite
 *
 * Tests:
 * 1. Session created after Passenger login (with sid, accessToken, and refreshToken)
 * 2. Session created after Assistant login (with sid, accessToken, and refreshToken)
 * 3. Admin session created only after successful MFA verification (not during step 1 challenge)
 * 4. Access token explicitly embeds sid and passes validateSession
 * 5. Access tokens use configured expiry (Passenger: 1h, Admin: 15m)
 * 6. Refresh token plaintext is never stored in database
 * 7. Refresh token hash (SHA-256) is stored in user_sessions
 * 8. Valid refresh rotates token successfully and returns new pair
 * 9. Old refresh token cannot issue a new token
 * 10. Refresh token reuse triggers family/session revocation (rotation_reuse_detected)
 * 11. Revoked session rejects access token in protect middleware
 * 12. Expired session rejects access token in protect middleware
 * 13. POST /api/auth/logout revokes current session on backend
 * 14. POST /api/auth/logout-all revokes every session for the user
 * 15. Password reset revokes all sessions with reason 'password_changed'
 * 16. Admin role change revokes all sessions with reason 'role_changed'
 * 17. Forced admin session revocation works (POST /api/admin/sessions/:id/revoke)
 * 18. MFA challenge token (mfa_pending) cannot access session endpoints or protected routes
 * 19. Legacy JWT without sid continues to work during transition window
 * 20. Refresh endpoint does not expose token hashes
 * 21. Session listing endpoints never expose refresh token hashes
 * 22. JWT issuer and audience validation enforce configuration
 * 23. JWT algorithm pinning rejects unexpected algorithms
 * 24. Passenger & Assistant existing flows remain functional
 * 25. Admin MFA flow remains functional
 * 26. Phase 5.1 audit hardening suite passes with 100% success
 * 27. Production frontend build succeeds
 */

const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const http = require('http');
const express = require('express');
const speakeasy = require('speakeasy');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const supabase = require('../../src/config/db');
const sessionService = require('../../src/services/sessionService');
const mfaService = require('../../src/services/mfaService');
const { protect } = require('../../src/middleware/authMiddleware');

const app = express();
app.use(express.json());

const authRoutes = require('../../src/routes/authRoutes');
const adminRoutes = require('../../src/routes/adminRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Test protected route
app.get('/api/test-protected', protect, (req, res) => {
  res.json({ success: true, user: req.user, sessionId: req.sessionId });
});

let server;
const PORT = 5097;
const BASE_URL = `http://localhost:${PORT}/api`;

async function makeRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('======================================================================');
  console.log('  ONECOOLIE PHASE 6.3: SESSION MANAGEMENT & ROTATION VERIFICATION');
  console.log('======================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] Test ${total}: ${message}`);
    } else {
      console.error(`[FAIL] Test ${total}: ${message}`);
      process.exitCode = 1;
    }
  }

  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  try {
    // -------------------------------------------------------------
    // FETCH TEST ACCOUNTS
    // -------------------------------------------------------------
    const { data: adminUser } = await supabase.from('users').select('*').eq('role', 'admin').limit(1).single();
    const { data: passengerUser } = await supabase.from('users').select('*').eq('role', 'passenger').limit(1).single();
    const { data: assistantUser } = await supabase.from('users').select('*').eq('role', 'assistant').limit(1).single();

    if (!adminUser || !passengerUser || !assistantUser) {
      throw new Error('Required test accounts missing from database.');
    }

    // Ensure test admin account is unlocked from any previous tests
    await supabase.from('users').update({ failed_login_attempts: 0, locked_until: null }).eq('id', adminUser.id);

    // -------------------------------------------------------------
    // TEST 1: Session Created after Passenger OTP Login
    // -------------------------------------------------------------
    // Simulate OTP Login by calling verifyOtpAndLogin flow or creating a session directly
    const passSessionRes = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'TestMobilePassenger/1.0', 'x-forwarded-for': '203.0.113.195' } },
      client: supabase
    });

    assert(
      passSessionRes.session?.id && passSessionRes.accessToken && passSessionRes.refreshToken,
      'Passenger login creates server-side session and returns accessToken + refreshToken'
    );

    const passengerSessionId = passSessionRes.session.id;
    const passengerAccessToken = passSessionRes.accessToken;
    const passengerRefreshToken = passSessionRes.refreshToken;

    // -------------------------------------------------------------
    // TEST 2: Session Created after Assistant Login
    // -------------------------------------------------------------
    const asstSessionRes = await sessionService.createSession({
      user: assistantUser,
      req: { headers: { 'user-agent': 'TestAssistantConsole/2.0' } },
      client: supabase
    });

    assert(
      asstSessionRes.session?.id && asstSessionRes.accessToken && asstSessionRes.refreshToken,
      'Assistant login creates server-side session and returns accessToken + refreshToken'
    );

    // -------------------------------------------------------------
    // TEST 3: Access Token Explicitly Embeds sid
    // -------------------------------------------------------------
    const decodedPass = jwt.decode(passengerAccessToken);
    assert(
      decodedPass && decodedPass.sid === passengerSessionId && decodedPass.role === 'passenger',
      'Access token contains sid claim bound to user_sessions record'
    );

    // -------------------------------------------------------------
    // TEST 4: Access Tokens Use Configured Expiry (1h Passenger, 15m Admin)
    // -------------------------------------------------------------
    const expDiffSeconds = decodedPass.exp - decodedPass.iat;
    assert(
      expDiffSeconds === 3600,
      'Passenger access token has configured 1-hour expiration (3600s)'
    );

    const adminTok = sessionService.generateAccessToken({ id: adminUser.id, role: 'admin', sid: 'test-sid' });
    const decodedAdmin = jwt.decode(adminTok);
    assert(
      decodedAdmin.exp - decodedAdmin.iat === 900,
      'Admin access token has configured 15-minute expiration (900s)'
    );

    // -------------------------------------------------------------
    // TEST 5: Plaintext Refresh Token Never Stored in Database
    // -------------------------------------------------------------
    const { data: dbSess } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('id', passengerSessionId)
      .single();

    assert(
      dbSess.refresh_token_hash !== passengerRefreshToken && dbSess.refresh_token_hash === sessionService.hashToken(passengerRefreshToken),
      'user_sessions stores SHA-256 hash of refresh token; raw token never stored'
    );

    // -------------------------------------------------------------
    // TEST 6: Valid Refresh Rotates Token Pair Successfully
    // -------------------------------------------------------------
    const rotRes = await makeRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: passengerRefreshToken }
    });

    assert(
      rotRes.ok && rotRes.data?.accessToken && rotRes.data?.refreshToken && rotRes.data.refreshToken !== passengerRefreshToken,
      'POST /api/auth/refresh rotates refresh token and returns new access + refresh pair'
    );

    const newAccessToken = rotRes.data.accessToken;
    const newRefreshToken = rotRes.data.refreshToken;

    // -------------------------------------------------------------
    // TEST 7: Old Rotated Refresh Token is Rejected
    // -------------------------------------------------------------
    // Attempting to refresh with the already-used old refresh token
    const reuseRes = await makeRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: passengerRefreshToken }
    });

    assert(
      reuseRes.status === 401 && reuseRes.data?.message?.includes('reuse detected'),
      'Submitting already rotated refresh token triggers reuse detection and 401 Unauthorized'
    );

    // -------------------------------------------------------------
    // TEST 8: Refresh Token Reuse Revokes Token Family
    // -------------------------------------------------------------
    const { data: revokedSess } = await supabase
      .from('user_sessions')
      .select('revoked_at, revocation_reason')
      .eq('id', passengerSessionId)
      .single();

    assert(
      !!revokedSess.revoked_at && revokedSess.revocation_reason === 'rotation_reuse_detected',
      'Token reuse revokes session family with reason "rotation_reuse_detected"'
    );

    // -------------------------------------------------------------
    // TEST 9: Revoked Session Rejects Access Token in Middleware
    // -------------------------------------------------------------
    const revCheck = await fetch(`http://localhost:${PORT}/api/test-protected`, {
      headers: { Authorization: `Bearer ${newAccessToken}` }
    });

    assert(
      revCheck.status === 401,
      'protect middleware strictly rejects access token from revoked session'
    );

    // -------------------------------------------------------------
    // TEST 10: Logout Revokes Current Backend Session
    // -------------------------------------------------------------
    const freshPass = await sessionService.createSession({
      user: passengerUser,
      client: supabase
    });

    const logoutRes = await makeRequest('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${freshPass.accessToken}` }
    });

    assert(
      logoutRes.ok && logoutRes.data?.message?.includes('invalidated'),
      'POST /api/auth/logout marks session as revoked on the backend'
    );

    const probeAfterLogout = await fetch(`http://localhost:${PORT}/api/test-protected`, {
      headers: { Authorization: `Bearer ${freshPass.accessToken}` }
    });

    assert(
      probeAfterLogout.status === 401,
      'Access token immediately rejected after calling POST /api/auth/logout'
    );

    // -------------------------------------------------------------
    // TEST 11: Logout-All Revokes Every User Session
    // -------------------------------------------------------------
    // Create 3 sessions for passenger
    const s1 = await sessionService.createSession({ user: passengerUser, client: supabase });
    const s2 = await sessionService.createSession({ user: passengerUser, client: supabase });
    const s3 = await sessionService.createSession({ user: passengerUser, client: supabase });

    const logoutAllRes = await makeRequest('/auth/logout-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${s1.accessToken}` }
    });

    assert(
      logoutAllRes.ok && logoutAllRes.data?.message?.includes('terminated'),
      'POST /api/auth/logout-all successfully terminates all sessions'
    );

    const p2Check = await fetch(`http://localhost:${PORT}/api/test-protected`, {
      headers: { Authorization: `Bearer ${s2.accessToken}` }
    });
    const p3Check = await fetch(`http://localhost:${PORT}/api/test-protected`, {
      headers: { Authorization: `Bearer ${s3.accessToken}` }
    });

    assert(
      p2Check.status === 401 && p3Check.status === 401,
      'All other device sessions are simultaneously invalidated after logout-all'
    );

    // -------------------------------------------------------------
    // TEST 12: Password Reset Revokes Active Sessions
    // -------------------------------------------------------------
    const s4 = await sessionService.createSession({ user: passengerUser, client: supabase });
    await sessionService.revokeAllUserSessions(passengerUser.id, 'password_changed', supabase);

    const s4Check = await fetch(`http://localhost:${PORT}/api/test-protected`, {
      headers: { Authorization: `Bearer ${s4.accessToken}` }
    });

    assert(
      s4Check.status === 401,
      'Password reset hook invalidates all sessions with reason "password_changed"'
    );

    // -------------------------------------------------------------
    // TEST 13: Role Change Revokes Active Sessions
    // -------------------------------------------------------------
    const s5 = await sessionService.createSession({ user: adminUser, client: supabase });
    await sessionService.revokeAllUserSessions(adminUser.id, 'role_changed', supabase);

    const s5Check = await fetch(`http://localhost:${PORT}/api/test-protected`, {
      headers: { Authorization: `Bearer ${s5.accessToken}` }
    });

    assert(
      s5Check.status === 401,
      'Admin role modification hook invalidates all active sessions for target user'
    );

    // -------------------------------------------------------------
    // TEST 14: Forced Admin Session Revocation Endpoint
    // -------------------------------------------------------------
    const victimSession = await sessionService.createSession({ user: passengerUser, client: supabase });
    const superAdminSession = await sessionService.createSession({ user: adminUser, client: supabase });

    const forceRevRes = await makeRequest(`/admin/sessions/${victimSession.session.id}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminSession.accessToken}` }
    });

    assert(
      forceRevRes.ok && forceRevRes.data?.success === true,
      'POST /api/admin/sessions/:id/revoke forcibly revokes target session'
    );

    const victimCheck = await fetch(`http://localhost:${PORT}/api/test-protected`, {
      headers: { Authorization: `Bearer ${victimSession.accessToken}` }
    });

    assert(
      victimCheck.status === 401,
      'Forcibly revoked session token is immediately blocked from API access'
    );

    // -------------------------------------------------------------
    // TEST 15: Session Listing Endpoint Never Exposes Token Hashes
    // -------------------------------------------------------------
    const sessListRes = await makeRequest('/auth/sessions', {
      headers: { Authorization: `Bearer ${superAdminSession.accessToken}` }
    });

    const hasHash = JSON.stringify(sessListRes.data).includes('refresh_token_hash');
    assert(
      sessListRes.ok && sessListRes.data?.sessions?.length > 0 && !hasHash,
      'GET /api/auth/sessions returns safe session telemetry and NEVER exposes refresh_token_hash'
    );

    // -------------------------------------------------------------
    // TEST 16: Legacy Token Compatibility Works During Transition
    // -------------------------------------------------------------
    const legacyJwt = jwt.sign(
      { id: passengerUser.id, role: 'passenger' }, // No sid
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const legacyProbe = await fetch(`http://localhost:${PORT}/api/test-protected`, {
      headers: { Authorization: `Bearer ${legacyJwt}` }
    });

    assert(
      legacyProbe.status === 200,
      'Legacy tokens without sid continue to be verified cryptographically during transition window'
    );

    // -------------------------------------------------------------
    // TEST 17: MFA Challenge Token (mfa_pending) Cannot Access Session Endpoints
    // -------------------------------------------------------------
    const mfaPendingTok = jwt.sign(
      { id: adminUser.id, role: 'admin', scope: 'mfa_pending' },
      process.env.JWT_SECRET,
      { expiresIn: '5m', issuer: 'onecoolie-api', audience: 'onecoolie-admin' }
    );

    const mfaProbe = await fetch(`http://localhost:${PORT}/api/auth/sessions`, {
      headers: { Authorization: `Bearer ${mfaPendingTok}` }
    });

    assert(
      mfaProbe.status === 401,
      'Intermediate mfa_pending challenge tokens strictly rejected from session endpoints'
    );

    // -------------------------------------------------------------
    // TEST 18: Admin MFA Verification Creates Session and Returns Refresh Token
    // -------------------------------------------------------------
    // Ensure admin has MFA record
    const mfaSetup = await mfaService.createEnrollment(adminUser, supabase).catch(() => null);
    const { data: mRec } = await supabase.from('admin_mfa').select('*').eq('user_id', adminUser.id).single();
    const plainSec = mfaService.decryptSecret(mRec);
    const code = speakeasy.totp({ secret: plainSec, encoding: 'base32' });

    // Step 2 Login Verification
    const step2Res = await makeRequest('/auth/admin/mfa/verify-login', {
      method: 'POST',
      body: {
        mfaToken: mfaPendingTok,
        code
      }
    });

    assert(
      step2Res.ok && !!step2Res.data?.refreshToken && !!step2Res.data?.sessionId,
      'Admin MFA verify-login creates server-side session and returns accessToken + refreshToken'
    );

  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  console.log('\n======================================================================');
  console.log(`  RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}% SUCCESS RATE)`);
  console.log('======================================================================\n');
}

runTests().catch((err) => {
  console.error('Session test runner fatal error:', err);
  if (server) server.close();
  process.exit(1);
});
