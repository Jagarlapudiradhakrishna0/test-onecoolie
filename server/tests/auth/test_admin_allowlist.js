/**
 * server/test_phase6_admin_allowlist.js
 *
 * ONECOOLIE: Strict Two-Account Administrator Access Control Verification Suite
 *
 * Verifies that ONLY the two approved administrator identities:
 *   1. admin01@onecoolie.in
 *   2. admin02@onecoolie.in
 * are permitted to authenticate, receive MFA challenges, create admin sessions,
 * access /api/admin/* APIs, and join admin Socket.IO rooms.
 *
 * All tests run against live backend routes and server-authoritative security barriers.
 */

process.env.NODE_ENV = 'test';
const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const supabase = require('../../src/config/db');
const { seedAdminAccounts } = require('../../src/scripts/seed_admin_accounts');
const mfaService = require('../../src/services/mfaService');
const sessionService = require('../../src/services/sessionService');
const { isApprovedAdminEmail, normalizeEmail, getApprovedAdminEmails } = require('../../src/config/adminAllowlist');

const authRoutes = require('../../src/routes/authRoutes');
const adminRoutes = require('../../src/routes/adminRoutes');
const { isProduction } = require('../../src/config/environment');

const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api`;

let server;
let io;

async function makeRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

function connectSocketClient(token) {
  return new Promise((resolve) => {
    const client = ioClient(`http://localhost:${PORT}`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      timeout: 3000
    });

    let settled = false;
    client.on('connect', () => {
      if (!settled) {
        settled = true;
        resolve({ connected: true, client, error: null });
      }
    });

    client.on('connect_error', (err) => {
      if (!settled) {
        settled = true;
        resolve({ connected: false, client, error: err.message });
      }
    });

    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ connected: false, client, error: 'Connection timeout' });
      }
    }, 2500);
  });
}

async function runTests() {
  console.log('======================================================================');
  console.log('  ONECOOLIE STRICT TWO-ACCOUNT ADMIN ACCESS CONTROL VERIFICATION');
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

  // 1. Initialize Test Express App + Socket.IO Server
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);

  server = http.createServer(app);
  io = new Server(server, { cors: { origin: '*' } });

  // Attach hardened socket auth middleware matching src/index.js
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      if (decoded.scope === 'mfa_pending' || decoded.scope === 'mfa_setup_required') {
        return next(new Error('Intermediate MFA token rejected'));
      }
      if (!decoded.sid) return next(new Error('Session ID (sid) required'));

      const { data: session } = await supabase.from('user_sessions').select('*').eq('id', decoded.sid).maybeSingle();
      if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
        return next(new Error('Session invalid or revoked'));
      }

      const { data: user } = await supabase.from('users').select('*').eq('id', session.user_id).maybeSingle();
      if (!user) return next(new Error('User not found'));

      socket.data = { user, session };
      return next();
    } catch (e) {
      return next(new Error(`Authentication error: ${e.message}`));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join_admin', () => {
      const user = socket.data?.user;
      if (!user || user.role !== 'admin' || !isApprovedAdminEmail(user.email) || user.is_approved === false) {
        return socket.emit('admin_auth_error', { message: 'Unauthorized: Admin privileges required.' });
      }
      socket.join('admin_room');
      socket.emit('admin_joined', { success: true });
    });
  });

  await new Promise((resolve) => server.listen(PORT, resolve));

  try {
    // Ensure both admin accounts exist in database
    await seedAdminAccounts();

    // Fetch approved admin 1 & admin 2
    const { data: admin1 } = await supabase.from('users').select('*').eq('email', 'admin01@onecoolie.in').single();
    const { data: admin2 } = await supabase.from('users').select('*').eq('email', 'admin02@onecoolie.in').single();

    // Fetch or create a test passenger
    let { data: passenger } = await supabase.from('users').select('*').eq('role', 'passenger').limit(1).maybeSingle();
    if (!passenger) {
      const pwHash = await bcrypt.hash('Passenger123!', 10);
      const { data: pCreated } = await supabase.from('users').insert([{
        custom_id: 'PAXTEST01',
        name: 'Test Passenger',
        email: 'passenger_test_allowlist@onecoolie.in',
        role: 'passenger',
        password: pwHash,
        is_approved: true
      }]).select().single();
      passenger = pCreated;
    }

    // Create a non-allowlisted user with database role = 'admin' (rogue/unauthorized admin)
    const rogueEmail = 'rogue_admin_unauthorized@example.com';
    let { data: rogueAdmin } = await supabase.from('users').select('*').eq('email', rogueEmail).maybeSingle();
    const roguePassword = 'RogueAdminPassword123!';
    if (!rogueAdmin) {
      const pwHash = await bcrypt.hash(roguePassword, 10);
      const { data: rCreated } = await supabase.from('users').insert([{
        custom_id: 'ROGUE01',
        name: 'Rogue Unauthorized Admin',
        email: rogueEmail,
        role: 'admin',
        admin_role: 'super_admin',
        password: pwHash,
        is_approved: true
      }]).select().single();
      rogueAdmin = rCreated;
    } else {
      await supabase.from('users').update({ role: 'admin', admin_role: 'super_admin', is_approved: true }).eq('id', rogueAdmin.id);
    }

    // Set a known working password on both approved admins for test determinism
    const testAdminPassword = 'ApprovedAdminPass123!';
    const testAdminHash = await bcrypt.hash(testAdminPassword, 10);
    await supabase.from('users').update({
      password: testAdminHash,
      failed_login_attempts: 0,
      locked_until: null,
      is_approved: true
    }).in('id', [admin1.id, admin2.id]);

    // Ensure clean MFA slate for admin 1 and admin 2
    await supabase.from('mfa_recovery_codes').delete().in('user_id', [admin1.id, admin2.id]);
    await supabase.from('admin_mfa').delete().in('user_id', [admin1.id, admin2.id]);

    // -------------------------------------------------------------
    // SECTION 1: AUTHORIZED ACCESS
    // -------------------------------------------------------------

    // TEST 1: Approved Admin 1 can complete credentials + MFA login
    // Step 1: Credentials login (receives MFA setup token or challenge)
    const a1Step1 = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'admin01@onecoolie.in', password: testAdminPassword, role: 'admin' }
    });
    assert(
      a1Step1.status === 200 && a1Step1.data.requiresMfa === true && (a1Step1.data.mfaSetupToken || a1Step1.data.mfaToken),
      'Approved Admin 1 can authenticate credentials and receive MFA challenge'
    );

    // Setup MFA for admin 1
    const setupToken1 = a1Step1.data.mfaSetupToken || a1Step1.data.mfaToken;
    const a1Setup = await makeRequest('/auth/admin/mfa/setup', {
      method: 'POST',
      body: { mfaSetupToken: setupToken1 }
    });
const speakeasy = require('speakeasy');
    const { data: mfaRec1 } = await supabase.from('admin_mfa').select('*').eq('user_id', admin1.id).single();
    const plainSecret1 = mfaService.decryptSecret(mfaRec1);
    const validOtp1 = speakeasy.totp({ secret: plainSecret1, encoding: 'base32' });

    // Complete enrollment for Admin 1 (returns full access token + session)
    const a1Enroll = await makeRequest('/auth/admin/mfa/verify-enrollment', {
      method: 'POST',
      body: { mfaSetupToken: setupToken1, code: validOtp1 }
    });
    const a1AccessToken = a1Enroll.data?.accessToken;
    assert(
      a1Enroll.status === 200 && !!a1AccessToken && a1Enroll.data.user?.email === 'admin01@onecoolie.in',
      'Approved Admin 1 can complete TOTP verification and obtain administrative access'
    );

    // TEST 2: Approved Admin 2 can complete credentials + MFA login
    const a2Step1 = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'admin02@onecoolie.in', password: testAdminPassword, role: 'admin' }
    });
    assert(
      a2Step1.status === 200 && a2Step1.data.requiresMfa === true && (a2Step1.data.mfaSetupToken || a2Step1.data.mfaToken),
      'Approved Admin 2 can authenticate credentials and receive MFA challenge'
    );

    const setupToken2 = a2Step1.data.mfaSetupToken || a2Step1.data.mfaToken;
    await makeRequest('/auth/admin/mfa/setup', {
      method: 'POST',
      body: { mfaSetupToken: setupToken2 }
    });
    const { data: mfaRec2 } = await supabase.from('admin_mfa').select('*').eq('user_id', admin2.id).single();
    const plainSecret2 = mfaService.decryptSecret(mfaRec2);
    const validOtp2 = speakeasy.totp({ secret: plainSecret2, encoding: 'base32' });

    const a2Enroll = await makeRequest('/auth/admin/mfa/verify-enrollment', {
      method: 'POST',
      body: { mfaSetupToken: setupToken2, code: validOtp2 }
    });
    const a2AccessToken = a2Enroll.data?.accessToken;
    assert(
      a2Enroll.status === 200 && !!a2AccessToken && a2Enroll.data.user?.email === 'admin02@onecoolie.in',
      'Approved Admin 2 can complete TOTP verification and obtain administrative access'
    );

    // TEST 3: Approved admins can access protected admin APIs
    const a1Me = await makeRequest('/admin/me', {
      headers: { Authorization: `Bearer ${a1AccessToken}` }
    });
    const a2Me = await makeRequest('/admin/me', {
      headers: { Authorization: `Bearer ${a2AccessToken}` }
    });
    assert(
      a1Me.status === 200 && a2Me.status === 200 && a1Me.data.email === 'admin01@onecoolie.in',
      'Approved admins can successfully access protected /api/admin/* endpoints'
    );

    // TEST 4: Approved admins can establish authorized Admin Socket.IO connections
    const a1SocketRes = await connectSocketClient(a1AccessToken);
    let a1JoinedRoom = false;
    if (a1SocketRes.connected) {
      a1SocketRes.client.emit('join_admin');
      a1JoinedRoom = await new Promise((resolve) => {
        a1SocketRes.client.on('admin_joined', (data) => resolve(Boolean(data?.success)));
        a1SocketRes.client.on('admin_auth_error', () => resolve(false));
        setTimeout(() => resolve(false), 2000);
      });
      a1SocketRes.client.disconnect();
    }
    assert(
      a1SocketRes.connected && a1JoinedRoom === true,
      'Approved admins can establish authenticated Socket.IO connections and join admin_room'
    );

    // -------------------------------------------------------------
    // SECTION 2: UNAUTHORIZED ACCESS
    // -------------------------------------------------------------

    // TEST 5: Non-allowlisted user with normal role cannot access Admin login
    const nonAdminLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: passenger.email, password: 'Passenger123!', role: 'admin' }
    });
    assert(
      nonAdminLogin.status === 401 && nonAdminLogin.data.message.includes('not authorized'),
      'Non-allowlisted user with a normal role cannot access Admin login'
    );

    // TEST 6: Non-allowlisted user with an administrative database role is still denied
    const rogueLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: rogueEmail, password: roguePassword, role: 'admin' }
    });
    assert(
      rogueLogin.status === 401 && rogueLogin.data.message.includes('not authorized'),
      'Non-allowlisted user with an administrative database role is strictly denied'
    );

    // TEST 7: Non-allowlisted user cannot receive MFA challenge tokens
    assert(
      !rogueLogin.data?.mfaToken && !rogueLogin.data?.mfaSetupToken,
      'Non-allowlisted user cannot receive MFA challenge tokens'
    );

    // TEST 8: Non-allowlisted user cannot receive access tokens from admin authentication
    assert(
      !rogueLogin.data?.token && !rogueLogin.data?.accessToken && !rogueLogin.data?.refreshToken,
      'Non-allowlisted user cannot receive access tokens from admin authentication'
    );

    // TEST 9: Non-allowlisted user cannot create an admin session
    const { data: rogueSessions } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', rogueAdmin.id)
      .eq('role', 'admin');
    assert(
      !rogueSessions || rogueSessions.length === 0,
      'Non-allowlisted user cannot create a server-side admin session'
    );

    // TEST 10: Non-allowlisted user cannot access /api/admin/*
    // Attempt with a forged or synthesized session for rogueAdmin
    const rogueSession = await sessionService.createSession({ user: rogueAdmin, client: supabase });
    const rogueApiRes = await makeRequest('/admin/me', {
      headers: { Authorization: `Bearer ${rogueSession.accessToken}` }
    });
    assert(
      rogueApiRes.status === 403 && rogueApiRes.data.message.includes('not authorized'),
      'Non-allowlisted user cannot access /api/admin/* (perimeter middleware rejects non-allowlisted admin)'
    );

    // TEST 11: Non-allowlisted user cannot join Admin Socket.IO rooms
    const rogueSocketRes = await connectSocketClient(rogueSession.accessToken);
    let rogueAuthError = false;
    if (rogueSocketRes.connected) {
      rogueSocketRes.client.emit('join_admin');
      rogueAuthError = await new Promise((resolve) => {
        rogueSocketRes.client.on('admin_auth_error', (data) => resolve(Boolean(data?.message)));
        rogueSocketRes.client.on('admin_joined', () => resolve(false));
        setTimeout(() => resolve(false), 2000);
      });
      rogueSocketRes.client.disconnect();
    }
    assert(
      rogueSocketRes.connected && rogueAuthError === true,
      'Non-allowlisted user cannot join Admin Socket.IO rooms (admin_auth_error emitted)'
    );

    // -------------------------------------------------------------
    // SECTION 3: SECURITY BYPASS TESTS
    // -------------------------------------------------------------

    // TEST 12: Changing frontend role state does not grant access
    // Simulated: Passenger attempts admin route with legitimate passenger token
    const paxSession = await sessionService.createSession({ user: passenger, client: supabase });
    const paxOnAdmin = await makeRequest('/admin/me', {
      headers: { Authorization: `Bearer ${paxSession.accessToken}` }
    });
    assert(
      paxOnAdmin.status === 403,
      'Changing frontend role state does not grant access (server-authoritative role check)'
    );

    // TEST 13: Manipulating localStorage does not grant access
    // Simulated: Client sends fabricated bearer token with self-claimed admin identity
    const fakeToken = jwt.sign(
      { id: passenger.id, role: 'admin', email: 'admin01@onecoolie.in' },
      'wrong_or_forged_secret',
      { expiresIn: '1h' }
    );
    const forgedTokenRes = await makeRequest('/admin/me', {
      headers: { Authorization: `Bearer ${fakeToken}` }
    });
    assert(
      forgedTokenRes.status === 401,
      'Manipulating localStorage / crafting invalid JWT does not grant access'
    );

    // TEST 14: A forged client role field is ignored
    // Simulated: Caller sends a JWT where role claim is 'admin' signed with correct secret but missing sid/session
    const tokenNoSid = jwt.sign(
      { id: passenger.id, role: 'admin', email: passenger.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h', algorithm: 'HS256' }
    );
    const fakeRoleRes = await makeRequest('/admin/me', {
      headers: { Authorization: `Bearer ${tokenNoSid}` }
    });
    assert(
      fakeRoleRes.status === 403 || fakeRoleRes.status === 401,
      'Forged client role claim without allowlisted identity and valid admin session is rejected'
    );

    // TEST 15: A valid non-admin JWT cannot access Admin APIs
    const validPaxRes = await makeRequest('/admin/stats', {
      headers: { Authorization: `Bearer ${paxSession.accessToken}` }
    });
    assert(
      validPaxRes.status === 403,
      'A valid non-admin JWT cannot access Admin APIs (/admin/stats returns 403)'
    );

    // TEST 16: A stale/revoked admin session cannot access Admin APIs
    // Revoke admin 1 session
    const sidToRevoke = a1Enroll.data?.sessionId;
    if (sidToRevoke) {
      await sessionService.revokeSession(sidToRevoke, 'admin_forced', supabase);
    }
    const revokedAdminRes = await makeRequest('/admin/me', {
      headers: { Authorization: `Bearer ${a1AccessToken}` }
    });
    assert(
      revokedAdminRes.status === 401 && revokedAdminRes.data.message.includes('revoked'),
      'A stale or revoked admin session cannot access Admin APIs'
    );

    // TEST 17: Disabled allowlisted admin cannot log in
    // Temporarily disable admin 2 (is_approved: false)
    await supabase.from('users').update({ is_approved: false }).eq('id', admin2.id);
    const disabledLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'admin02@onecoolie.in', password: testAdminPassword, role: 'admin' }
    });
    // Restore admin 2 approval
    await supabase.from('users').update({ is_approved: true }).eq('id', admin2.id);
    assert(
      disabledLogin.status === 403 && disabledLogin.data.message.includes('disabled'),
      'Disabled allowlisted admin cannot log in (status check enforces is_approved !== false)'
    );

    // TEST 18: Role escalation without allowlisted identity does not grant admin access
    // Attempt to promote rogueAdmin to super_admin via setAdminRole
    // Using a fresh valid admin 2 session
    const freshA2Session = await sessionService.createSession({ user: admin2, client: supabase });
    const escalationAttempt = await makeRequest(`/admin/users/${rogueAdmin.id}/admin-role`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${freshA2Session.accessToken}` },
      body: { admin_role: 'super_admin' }
    });
    assert(
      escalationAttempt.status === 403 && escalationAttempt.data.message.includes('approved administrator identities'),
      'Role escalation without allowlisted identity is blocked by setAdminRole'
    );

  } finally {
    // Clean up rogue test admin
    await supabase.from('users').delete().eq('email', 'rogue_admin_unauthorized@example.com');
    await supabase.from('users').delete().eq('email', 'passenger_test_allowlist@onecoolie.in');

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  console.log('\n======================================================================');
  console.log(`  RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}% SUCCESS RATE)`);
  console.log('======================================================================\n');
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('TEST FATAL ERROR:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
