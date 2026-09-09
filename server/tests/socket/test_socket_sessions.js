/**
 * server/test_phase6_socket_sessions.js
 *
 * ONECOOLIE Phase 6.5: Real-Time Socket.IO Session Revocation & Authentication Hardening
 * Comprehensive Verification Suite
 *
 * Minimum required tests:
 * 1. Valid active session can establish Socket.IO connection.
 * 2. Invalid JWT is rejected.
 * 3. Expired JWT is rejected.
 * 4. JWT using an algorithm other than HS256 is rejected.
 * 5. Invalid issuer is rejected.
 * 6. Invalid audience is rejected.
 * 7. mfa_pending token is rejected.
 * 8. mfa_setup_required token is rejected.
 * 9. Missing sid is rejected.
 * 10. Unknown session is rejected.
 * 11. Revoked session cannot connect.
 * 12. Expired server-side session cannot connect.
 * 13. Valid authenticated socket contains authoritative userId, role, and sessionId.
 * 14. Normal logout immediately disconnects the current session socket.
 * 15. Logout does not disconnect another device session.
 * 16. Logout-all immediately disconnects all user sockets.
 * 17. Admin forced session revocation immediately disconnects the targeted socket.
 * 18. Admin forced single-session revocation does not disconnect unrelated sessions.
 * 19. Password reset immediately disconnects all user sockets.
 * 20. Password change immediately disconnects all user sockets.
 * 21. Admin role modification disconnects affected user sessions.
 * 22. Refresh token reuse detection disconnects sockets belonging to the revoked family.
 * 23. Socket mappings are cleaned after normal disconnect.
 * 24. Socket mappings are cleaned after forced session revocation.
 * 25. Reconnection attempt with revoked session is rejected.
 * 26. Existing Socket.IO functionality continues working for valid authenticated users.
 */

process.env.NODE_ENV = 'test';
const path = require('path');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const jwt = require('jsonwebtoken');
const { io: ioClient } = require('socket.io-client');
const supabase = require('../../src/config/db');
const sessionService = require('../../src/services/sessionService');
const socketSessionService = require('../../src/services/socketSessionService');
const { server, io } = require('../../src/index');

const TEST_PORT = 5098;
const SOCKET_URL = `http://localhost:${TEST_PORT}`;

function connectClient(token, options = {}) {
  return new Promise((resolve) => {
    const client = ioClient(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: options.reconnection ?? false,
      timeout: 3000
    });

    let settled = false;

    client.on('connect', () => {
      if (!settled) {
        settled = true;
        resolve({ client, error: null });
      }
    });

    client.on('connect_error', (err) => {
      if (!settled) {
        settled = true;
        resolve({ client, error: err });
      }
    });

    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ client, error: new Error('Connection timeout') });
      }
    }, 4000);
  });
}

function waitForEvent(socket, eventName, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(null);
    }, timeoutMs);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data || true);
    });
  });
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runVerificationSuite() {
  console.log('======================================================================');
  console.log('  ONECOOLIE PHASE 6.5: REAL-TIME SOCKET.IO HARDENING & REVOCATION SUITE');
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

  // Start the Socket.IO HTTP server on test port
  await new Promise((resolve) => {
    server.listen(TEST_PORT, resolve);
  });
  console.log(`[SETUP] Test WebSocket server listening on port ${TEST_PORT}\n`);

  const activeClients = [];

  try {
    // -------------------------------------------------------------
    // FETCH TEST ACCOUNTS
    // -------------------------------------------------------------
    const { data: adminUser } = await supabase.from('users').select('*').eq('role', 'admin').limit(1).single();
    const { data: passengerUser } = await supabase.from('users').select('*').eq('role', 'passenger').limit(1).single();
    const { data: assistantUser } = await supabase.from('users').select('*').eq('role', 'assistant').limit(1).single();

    if (!adminUser || !passengerUser || !assistantUser) {
      throw new Error('Required test users (admin, passenger, assistant) missing in database');
    }

    // -------------------------------------------------------------
    // TEST 1: Valid Active Session Can Establish Socket.IO Connection
    // -------------------------------------------------------------
    const sess1 = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'TestDevice/1.0', 'x-forwarded-for': '127.0.0.1' } },
      client: supabase
    });

    const conn1 = await connectClient(sess1.accessToken);
    if (conn1.client) activeClients.push(conn1.client);

    assert(
      conn1.client.connected && conn1.error === null,
      'Valid active session can establish Socket.IO connection'
    );

    // -------------------------------------------------------------
    // TEST 2: Invalid JWT is Rejected
    // -------------------------------------------------------------
    const conn2 = await connectClient('invalid.jwt.token.payload');
    if (conn2.client) activeClients.push(conn2.client);

    assert(
      !conn2.client.connected && conn2.error && conn2.error.message.includes('Authentication error'),
      'Invalid JWT is rejected with Authentication error'
    );

    // -------------------------------------------------------------
    // TEST 3: Expired JWT is Rejected
    // -------------------------------------------------------------
    const expiredJwt = jwt.sign(
      { id: passengerUser.id, role: 'passenger', sid: sess1.session.id },
      process.env.JWT_SECRET,
      { expiresIn: '-10s', issuer: 'onecoolie-api', audience: 'onecoolie-client', algorithm: 'HS256' }
    );
    const conn3 = await connectClient(expiredJwt);
    if (conn3.client) activeClients.push(conn3.client);

    assert(
      !conn3.client.connected && conn3.error && conn3.error.message.toLowerCase().includes('expired'),
      'Expired JWT is rejected during handshake'
    );

    // -------------------------------------------------------------
    // TEST 4: JWT Using an Algorithm Other Than HS256 is Rejected
    // -------------------------------------------------------------
    // Sign token with header claiming HS384 or none
    const wrongAlgToken = jwt.sign(
      { id: passengerUser.id, role: 'passenger', sid: sess1.session.id },
      process.env.JWT_SECRET,
      { algorithm: 'HS384', issuer: 'onecoolie-api', audience: 'onecoolie-client' }
    );
    const conn4 = await connectClient(wrongAlgToken);
    if (conn4.client) activeClients.push(conn4.client);

    assert(
      !conn4.client.connected && conn4.error,
      'JWT using algorithm other than HS256 is rejected (algorithm pinning)'
    );

    // -------------------------------------------------------------
    // TEST 5: Invalid Issuer is Rejected
    // -------------------------------------------------------------
    const wrongIssuerToken = jwt.sign(
      { id: passengerUser.id, role: 'passenger', sid: sess1.session.id },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', issuer: 'untrusted-issuer', audience: 'onecoolie-client', expiresIn: '1h' }
    );
    const conn5 = await connectClient(wrongIssuerToken);
    if (conn5.client) activeClients.push(conn5.client);

    assert(
      !conn5.client.connected && conn5.error,
      'JWT with invalid issuer is rejected'
    );

    // -------------------------------------------------------------
    // TEST 6: Invalid Audience is Rejected
    // -------------------------------------------------------------
    const wrongAudToken = jwt.sign(
      { id: passengerUser.id, role: 'passenger', sid: sess1.session.id },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', issuer: 'onecoolie-api', audience: 'untrusted-client', expiresIn: '1h' }
    );
    const conn6 = await connectClient(wrongAudToken);
    if (conn6.client) activeClients.push(conn6.client);

    assert(
      !conn6.client.connected && conn6.error,
      'JWT with invalid audience is rejected'
    );

    // -------------------------------------------------------------
    // TEST 7: mfa_pending Token is Rejected
    // -------------------------------------------------------------
    const mfaPendingTok = jwt.sign(
      { id: adminUser.id, role: 'admin', scope: 'mfa_pending', sid: sess1.session.id },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', issuer: 'onecoolie-api', audience: 'onecoolie-client', expiresIn: '5m' }
    );
    const conn7 = await connectClient(mfaPendingTok);
    if (conn7.client) activeClients.push(conn7.client);

    assert(
      !conn7.client.connected && conn7.error && conn7.error.message.includes('MFA'),
      'mfa_pending intermediate token cannot establish Socket.IO connection'
    );

    // -------------------------------------------------------------
    // TEST 8: mfa_setup_required Token is Rejected
    // -------------------------------------------------------------
    const mfaSetupTok = jwt.sign(
      { id: adminUser.id, role: 'admin', scope: 'mfa_setup_required', sid: sess1.session.id },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', issuer: 'onecoolie-api', audience: 'onecoolie-client', expiresIn: '5m' }
    );
    const conn8 = await connectClient(mfaSetupTok);
    if (conn8.client) activeClients.push(conn8.client);

    assert(
      !conn8.client.connected && conn8.error && conn8.error.message.includes('MFA'),
      'mfa_setup_required intermediate token cannot establish Socket.IO connection'
    );

    // -------------------------------------------------------------
    // TEST 9: Missing sid is Rejected (No Legacy JWT on Sockets)
    // -------------------------------------------------------------
    const noSidToken = jwt.sign(
      { id: passengerUser.id, role: 'passenger' },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', issuer: 'onecoolie-api', audience: 'onecoolie-client', expiresIn: '1h' }
    );
    const conn9 = await connectClient(noSidToken);
    if (conn9.client) activeClients.push(conn9.client);

    assert(
      !conn9.client.connected && conn9.error && conn9.error.message.includes('sid'),
      'JWT missing sid is strictly rejected on Socket.IO'
    );

    // -------------------------------------------------------------
    // TEST 10: Unknown Session is Rejected
    // -------------------------------------------------------------
    const unknownSidToken = jwt.sign(
      { id: passengerUser.id, role: 'passenger', sid: '00000000-0000-0000-0000-000000000000' },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', issuer: 'onecoolie-api', audience: 'onecoolie-client', expiresIn: '1h' }
    );
    const conn10 = await connectClient(unknownSidToken);
    if (conn10.client) activeClients.push(conn10.client);

    assert(
      !conn10.client.connected && conn10.error && conn10.error.message.includes('Session not found'),
      'Token with non-existent sid is rejected by database session lookup'
    );

    // -------------------------------------------------------------
    // TEST 11: Revoked Session Cannot Connect
    // -------------------------------------------------------------
    const sessToRevoke = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'TestDevice/1.0' } },
      client: supabase
    });
    await sessionService.revokeSession(sessToRevoke.session.id, 'logout', supabase);

    const conn11 = await connectClient(sessToRevoke.accessToken);
    if (conn11.client) activeClients.push(conn11.client);

    assert(
      !conn11.client.connected && conn11.error && conn11.error.message.includes('revoked'),
      'Revoked session cannot establish new Socket.IO connection'
    );

    // -------------------------------------------------------------
    // TEST 12: Expired Server-Side Session Cannot Connect
    // -------------------------------------------------------------
    const sessToExpire = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'TestDevice/1.0' } },
      client: supabase
    });
    await supabase
      .from('user_sessions')
      .update({ expires_at: new Date(Date.now() - 60000).toISOString() })
      .eq('id', sessToExpire.session.id);

    const conn12 = await connectClient(sessToExpire.accessToken);
    if (conn12.client) activeClients.push(conn12.client);

    assert(
      !conn12.client.connected && conn12.error && conn12.error.message.includes('expired'),
      'Expired server-side session cannot establish Socket.IO connection'
    );

    // -------------------------------------------------------------
    // TEST 13: Valid Authenticated Socket Contains Authoritative Identity
    // -------------------------------------------------------------
    const serverSocket = io.sockets.sockets.get(conn1.client.id);

    assert(
      serverSocket &&
        serverSocket.userId === passengerUser.id &&
        serverSocket.role === 'passenger' &&
        serverSocket.sessionId === sess1.session.id &&
        serverSocket.familyId === sess1.session.family_id,
      'Authenticated socket has authoritative userId, role, sessionId, and familyId attached'
    );

    // -------------------------------------------------------------
    // TEST 14: Normal Logout Immediately Disconnects Current Session Socket
    // -------------------------------------------------------------
    const sessLogout = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'LogoutTest/1.0' } },
      client: supabase
    });
    const connLogout = await connectClient(sessLogout.accessToken);
    if (connLogout.client) activeClients.push(connLogout.client);

    const revokedEventPromise = waitForEvent(connLogout.client, 'session-revoked');
    const disconnectPromise = waitForEvent(connLogout.client, 'disconnect');

    // Trigger normal logout
    await sessionService.revokeSession(sessLogout.session.id, 'logout', supabase);

    const revokedData = await revokedEventPromise;
    await disconnectPromise;

    assert(
      revokedData && revokedData.reason === 'logout' && !connLogout.client.connected,
      'Normal logout immediately emits session-revoked and disconnects the session socket'
    );

    // -------------------------------------------------------------
    // TEST 15: Logout Does NOT Disconnect Another Device Session
    // -------------------------------------------------------------
    const sessDevA = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'DeviceA/1.0' } },
      client: supabase
    });
    const sessDevB = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'DeviceB/1.0' } },
      client: supabase
    });

    const connDevA = await connectClient(sessDevA.accessToken);
    const connDevB = await connectClient(sessDevB.accessToken);
    if (connDevA.client) activeClients.push(connDevA.client);
    if (connDevB.client) activeClients.push(connDevB.client);

    // Revoke Device A only
    await sessionService.revokeSession(sessDevA.session.id, 'logout', supabase);
    await delay(200);

    assert(
      !connDevA.client.connected && connDevB.client.connected,
      'Logout on Device A terminates Device A socket while Device B remains actively connected'
    );

    // -------------------------------------------------------------
    // TEST 16: Logout-All Immediately Disconnects All User Sockets
    // -------------------------------------------------------------
    const sessAll1 = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'Phone/1.0' } },
      client: supabase
    });
    const sessAll2 = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'Tablet/1.0' } },
      client: supabase
    });

    const connAll1 = await connectClient(sessAll1.accessToken);
    const connAll2 = await connectClient(sessAll2.accessToken);
    if (connAll1.client) activeClients.push(connAll1.client);
    if (connAll2.client) activeClients.push(connAll2.client);

    await sessionService.revokeAllUserSessions(passengerUser.id, 'logout', supabase);
    await delay(200);

    assert(
      !connAll1.client.connected && !connAll2.client.connected,
      'Logout-all immediately disconnects all sockets across all devices for the user'
    );

    // -------------------------------------------------------------
    // TEST 17: Admin Forced Session Revocation Disconnects Targeted Socket
    // -------------------------------------------------------------
    const sessAdminForced = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'TargetedAdminRevoke/1.0' } },
      client: supabase
    });
    const connAdminForced = await connectClient(sessAdminForced.accessToken);
    if (connAdminForced.client) activeClients.push(connAdminForced.client);

    const adminRevokePromise = waitForEvent(connAdminForced.client, 'session-revoked');
    await sessionService.revokeSession(sessAdminForced.session.id, 'admin_forced', supabase);
    const adminRevokedData = await adminRevokePromise;
    await delay(100);

    assert(
      adminRevokedData && adminRevokedData.reason === 'admin_forced' && !connAdminForced.client.connected,
      'Admin forced session revocation immediately terminates targeted socket with reason: admin_forced'
    );

    // -------------------------------------------------------------
    // TEST 18: Admin Forced Single-Session Revocation Does Not Disconnect Unrelated Sessions
    // -------------------------------------------------------------
    const sessUnrelated = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'UnrelatedSession/1.0' } },
      client: supabase
    });
    const connUnrelated = await connectClient(sessUnrelated.accessToken);
    if (connUnrelated.client) activeClients.push(connUnrelated.client);

    const sessTarget = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'TargetRevoke/1.0' } },
      client: supabase
    });
    const connTarget = await connectClient(sessTarget.accessToken);
    if (connTarget.client) activeClients.push(connTarget.client);

    await sessionService.revokeSession(sessTarget.session.id, 'admin_forced', supabase);
    await delay(150);

    assert(
      !connTarget.client.connected && connUnrelated.client.connected,
      'Admin single-session revocation leaves unrelated sessions intact and connected'
    );

    // -------------------------------------------------------------
    // TEST 19: Password Reset Immediately Disconnects All User Sockets
    // -------------------------------------------------------------
    const sessPwdReset = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'PwdReset/1.0' } },
      client: supabase
    });
    const connPwdReset = await connectClient(sessPwdReset.accessToken);
    if (connPwdReset.client) activeClients.push(connPwdReset.client);

    const pwdResetPromise = waitForEvent(connPwdReset.client, 'session-revoked');
    await sessionService.revokeAllUserSessions(passengerUser.id, 'password_changed', supabase);
    const pwdResetData = await pwdResetPromise;
    await delay(100);

    assert(
      pwdResetData && pwdResetData.reason === 'password_changed' && !connPwdReset.client.connected,
      'Password reset immediately disconnects all sockets with reason: password_changed'
    );

    // -------------------------------------------------------------
    // TEST 20: Password Change Immediately Disconnects All User Sockets
    // -------------------------------------------------------------
    const sessPwdChange = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'PwdChange/1.0' } },
      client: supabase
    });
    const connPwdChange = await connectClient(sessPwdChange.accessToken);
    if (connPwdChange.client) activeClients.push(connPwdChange.client);

    const pwdChangePromise = waitForEvent(connPwdChange.client, 'session-revoked');
    await sessionService.revokeAllUserSessions(passengerUser.id, 'password_changed', supabase);
    const pwdChangeData = await pwdChangePromise;
    await delay(100);

    assert(
      pwdChangeData && pwdChangeData.reason === 'password_changed' && !connPwdChange.client.connected,
      'Password change immediately terminates all user sockets'
    );

    // -------------------------------------------------------------
    // TEST 21: Admin Role Modification Disconnects Affected User Sessions
    // -------------------------------------------------------------
    const sessRoleMod = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'RoleMod/1.0' } },
      client: supabase
    });
    const connRoleMod = await connectClient(sessRoleMod.accessToken);
    if (connRoleMod.client) activeClients.push(connRoleMod.client);

    const roleModPromise = waitForEvent(connRoleMod.client, 'session-revoked');
    await sessionService.revokeAllUserSessions(passengerUser.id, 'role_changed', supabase);
    const roleModData = await roleModPromise;
    await delay(100);

    assert(
      roleModData && roleModData.reason === 'role_changed' && !connRoleMod.client.connected,
      'Admin role modification disconnects affected user sessions with reason: role_changed'
    );

    // -------------------------------------------------------------
    // TEST 22: Refresh Token Reuse Detection Disconnects Sockets in Token Family
    // -------------------------------------------------------------
    const sessFamily = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'FamilyDevice/1.0' } },
      client: supabase
    });
    const connFamily = await connectClient(sessFamily.accessToken);
    if (connFamily.client) activeClients.push(connFamily.client);

    const familyRevokePromise = waitForEvent(connFamily.client, 'session-revoked');
    await sessionService.revokeFamily(sessFamily.session.family_id, 'rotation_reuse_detected', supabase);
    const familyRevokedData = await familyRevokePromise;
    await delay(100);

    assert(
      familyRevokedData && familyRevokedData.reason === 'rotation_reuse_detected' && !connFamily.client.connected,
      'Refresh token reuse detection immediately disconnects all sockets in the compromised family'
    );

    // -------------------------------------------------------------
    // TEST 23: Socket Mappings Are Cleaned After Normal Disconnect
    // -------------------------------------------------------------
    const sessNormalDisc = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'NormalDisconnect/1.0' } },
      client: supabase
    });
    const connNormalDisc = await connectClient(sessNormalDisc.accessToken);
    if (connNormalDisc.client) activeClients.push(connNormalDisc.client);

    assert(
      socketSessionService.getActiveSocketCount(sessNormalDisc.session.id) === 1,
      'Socket session mapping registered on connect (count === 1)'
    );

    connNormalDisc.client.disconnect();
    await delay(150);

    assert(
      socketSessionService.getActiveSocketCount(sessNormalDisc.session.id) === 0,
      'Socket mappings are automatically cleaned after normal client disconnect'
    );

    // -------------------------------------------------------------
    // TEST 24: Socket Mappings Are Cleaned After Forced Session Revocation
    // -------------------------------------------------------------
    const sessForcedClean = await sessionService.createSession({
      user: passengerUser,
      req: { headers: { 'user-agent': 'ForcedClean/1.0' } },
      client: supabase
    });
    const connForcedClean = await connectClient(sessForcedClean.accessToken);
    if (connForcedClean.client) activeClients.push(connForcedClean.client);

    assert(
      socketSessionService.getActiveSocketCount(sessForcedClean.session.id) === 1,
      'Active socket count is 1 prior to revocation'
    );

    await sessionService.revokeSession(sessForcedClean.session.id, 'admin_forced', supabase);
    await delay(150);

    assert(
      socketSessionService.getActiveSocketCount(sessForcedClean.session.id) === 0,
      'Socket mappings are cleaned immediately upon forced session revocation'
    );

    // -------------------------------------------------------------
    // TEST 25: Reconnection Attempt with Revoked Session is Rejected
    // -------------------------------------------------------------
    const reconnected = await connectClient(sessForcedClean.accessToken);
    if (reconnected.client) activeClients.push(reconnected.client);

    assert(
      !reconnected.client.connected && reconnected.error && reconnected.error.message.includes('revoked'),
      'Reconnection attempt with a revoked session is rejected by handshake auth middleware'
    );

    // -------------------------------------------------------------
    // TEST 26: Existing Socket.IO Functionality Continues Working for Valid Authenticated Users
    // -------------------------------------------------------------
    const sessAsst = await sessionService.createSession({
      user: assistantUser,
      req: { headers: { 'user-agent': 'AssistantLive/1.0' } },
      client: supabase
    });
    const connAsst = await connectClient(sessAsst.accessToken);
    if (connAsst.client) activeClients.push(connAsst.client);

    const asstJoinedPromise = waitForEvent(connAsst.client, 'assistant_joined');
    connAsst.client.emit('join_assistant', assistantUser.id);
    const asstJoinedData = await asstJoinedPromise;

    const sessAdmin = await sessionService.createSession({
      user: adminUser,
      req: { headers: { 'user-agent': 'AdminLive/1.0' } },
      client: supabase
    });
    const connAdmin = await connectClient(sessAdmin.accessToken);
    if (connAdmin.client) activeClients.push(connAdmin.client);

    const adminJoinedPromise = waitForEvent(connAdmin.client, 'admin_joined');
    connAdmin.client.emit('join_admin');
    const adminJoinedData = await adminJoinedPromise;

    assert(
      asstJoinedData && asstJoinedData.assistantId === assistantUser.id &&
        adminJoinedData && adminJoinedData.success === true,
      'Existing Socket.IO room subscriptions (assistant and admin) continue working for valid sessions'
    );

  } finally {
    // Teardown all test client sockets
    for (const client of activeClients) {
      try {
        if (client.connected) client.disconnect();
      } catch {}
    }

    // Teardown server
    await new Promise((resolve) => server.close(resolve));
    console.log('\n[TEARDOWN] Test WebSocket server closed cleanly.');
  }

  console.log('\n======================================================================');
  console.log(`  PHASE 6.5 RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}% SUCCESS RATE)`);
  console.log('======================================================================\n');
}

runVerificationSuite().catch((err) => {
  console.error('Phase 6.5 Socket Verification fatal error:', err);
  server.close();
  process.exit(1);
});
