/**
 * server/src/services/sessionService.js
 *
 * ONECOOLIE Phase 6.3: Centralized Server-Side Session Management & Token Rotation Service
 *
 * Security Architecture & Guarantees:
 * 1. Opaque Refresh Tokens:
 *    Refresh tokens are high-entropy 64-byte random hex strings (128 chars).
 *    Plaintext tokens are returned to the client and NEVER stored in the database.
 * 2. SHA-256 Hashing:
 *    Only SHA-256 digests of refresh tokens are stored in `user_sessions.refresh_token_hash`.
 * 3. Token Rotation & Reuse Detection:
 *    On every refresh, a new refresh token is issued and the previous hash is archived.
 *    If an already-rotated token hash is presented, reuse/theft is detected, and the
 *    entire session family (family_id) is immediately revoked (`rotation_reuse_detected`).
 * 4. Absolute Session Expiration:
 *    Passengers/Assistants: 30 days. Admins: 7 days.
 *    Token refreshing NEVER extends the absolute session boundary (`expires_at`).
 * 5. Short-Lived Access Tokens:
 *    Passengers/Assistants: 1 hour. Admins: 15 minutes.
 *    Access tokens explicitly embed `sid` (session UUID), pinned to HS256 with issuer & audience.
 * 6. Centralized Revocation:
 *    Supports single session revocation, user-wide revocation (`logout-all`), family revocation,
 *    and automatic hooks for password changes, role changes, and admin deletions.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const defaultSupabase = require('../config/db');
const { logger } = require('../utils/logger');
const { logAdminAction } = require('./adminAuditService');

// Session configuration constants
const TOKEN_ISSUER = 'onecoolie-api';
const TOKEN_AUDIENCE = 'onecoolie-client';

const ACCESS_TOKEN_EXPIRY = {
  passenger: '1h',
  assistant: '1h',
  admin: '15m'
};

const ABSOLUTE_SESSION_DAYS = {
  passenger: 30,
  assistant: 30,
  admin: 7
};

// In-memory historical token rotation store (dual tracking alongside refresh_token_history table)
// Guarantees O(1) reuse detection even in environments where refresh_token_history migration is pending
const inMemoryRotatedHashes = new Map(); // tokenHash -> { sessionId, familyId, userId, rotatedAt, expiresAt }

/**
 * Computes SHA-256 hash of a raw token.
 *
 * @param {string} token
 * @returns {string} Hex-encoded SHA-256 hash
 */
function hashToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token required for hashing');
  }
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Generates an opaque, cryptographically random refresh token.
 *
 * @returns {string} 128-character hex string
 */
function generateOpaqueRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Generates a short-lived access JWT bound to a specific session (sid).
 *
 * @param {object} payload - { id, role, sid }
 * @returns {string} Signed JWT
 */
function generateAccessToken({ id, role, sid }) {
  if (!id || !role || !sid) {
    throw new Error('Access token requires id, role, and sid');
  }

  const expiresIn = ACCESS_TOKEN_EXPIRY[role] || '1h';

  return jwt.sign(
    {
      id,
      role,
      sid
    },
    process.env.JWT_SECRET,
    {
      expiresIn,
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      algorithm: 'HS256'
    }
  );
}

/**
 * Creates a new server-side session and returns tokens.
 *
 * @param {object} params - { user: { id, role }, req, client }
 * @returns {Promise<{ session: object, accessToken: string, refreshToken: string }>}
 */
async function createSession({ user, req, client = defaultSupabase }) {
  if (!user || !user.id || !user.role) {
    throw new Error('User context with id and role required to create session');
  }

  const rawRefreshToken = generateOpaqueRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken);

  // Compute absolute expiry date
  const sessionDays = ABSOLUTE_SESSION_DAYS[user.role] || 30;
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  // Derive request telemetry
  const userAgent = req?.headers?.['user-agent'] || 'Unknown Client';
  const ipAddress = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip || req?.socket?.remoteAddress || '127.0.0.1';
  const deviceInfo = userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop / Browser';

  const nowIso = new Date().toISOString();

  const { data: session, error } = await client
    .from('user_sessions')
    .insert([{
      user_id: user.id,
      family_id: crypto.randomUUID(),
      refresh_token_hash: refreshTokenHash,
      device_info: deviceInfo,
      user_agent: userAgent.slice(0, 500),
      ip_address: ipAddress.slice(0, 100),
      created_at: nowIso,
      last_activity_at: nowIso,
      expires_at: expiresAt.toISOString(),
      revoked_at: null,
      revocation_reason: null
    }])
    .select()
    .single();

  if (error || !session) {
    logger.error('Failed to create user session:', error);
    throw new Error('Database error initializing user session');
  }

  // Issue session-bound access token
  const accessToken = generateAccessToken({
    id: user.id,
    role: user.role,
    sid: session.id
  });

  return {
    session,
    accessToken,
    refreshToken: rawRefreshToken
  };
}

/**
 * Validates an active session given its session ID and user ID.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @param {object} [client]
 * @returns {Promise<{ valid: boolean, session?: object, reason?: string }>}
 */
async function validateSession(sessionId, userId, client = defaultSupabase) {
  if (!sessionId || !userId) {
    return { valid: false, reason: 'Session ID and User ID required' };
  }

  const { data: session, error } = await client
    .from('user_sessions')
    .select('id, user_id, expires_at, revoked_at, revocation_reason')
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !session) {
    return { valid: false, reason: 'Session not found' };
  }

  if (session.user_id !== userId) {
    return { valid: false, reason: 'Session user mismatch' };
  }

  if (session.revoked_at) {
    return { valid: false, reason: `Session revoked (${session.revocation_reason || 'revoked'})` };
  }

  if (new Date(session.expires_at) <= new Date()) {
    return { valid: false, reason: 'Session expired' };
  }

  return { valid: true, session };
}

/**
 * Rotates a refresh token and issues a new access token + refresh token pair.
 * Implements strict reuse detection: if a rotated token is re-submitted, the
 * entire token family is revoked immediately.
 *
 * @param {string} rawRefreshToken
 * @param {object} [req]
 * @param {object} [client]
 * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
 */
async function rotateRefreshToken(rawRefreshToken, req = null, client = defaultSupabase) {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
    throw new Error('Refresh token required');
  }

  const presentedHash = hashToken(rawRefreshToken);
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Check if token matches the CURRENT active hash for any session
  const { data: session, error: sessErr } = await client
    .from('user_sessions')
    .select('id, user_id, family_id, refresh_token_hash, expires_at, revoked_at, revocation_reason')
    .eq('refresh_token_hash', presentedHash)
    .maybeSingle();

  // 2. REUSE DETECTION: Check if token exists in rotation history (database table OR in-memory fallback)
  if (!session) {
    let historicalToken = inMemoryRotatedHashes.get(presentedHash);

    if (!historicalToken) {
      // Check if table exists and token was historically used
      try {
        const { data: dbHistorical } = await client
          .from('refresh_token_history')
          .select('session_id, family_id, user_id')
          .eq('token_hash', presentedHash)
          .maybeSingle();
        if (dbHistorical) historicalToken = dbHistorical;
      } catch (histErr) {}
    }

    if (historicalToken) {
      const familyIdToRevoke = historicalToken.family_id || historicalToken.familyId;
      const userIdAlert = historicalToken.user_id || historicalToken.userId;

      if (familyIdToRevoke) {
        await revokeFamily(familyIdToRevoke, 'rotation_reuse_detected', client);
      }

      // Phase 6.7: Record security event and trigger automated incident creation
      try {
        const { recordSecurityEvent } = require('./securityMonitoringService');
        await recordSecurityEvent({
          eventType: 'refresh_token_reuse_detected',
          severity: 'critical',
          userId: userIdAlert,
          familyId: familyIdToRevoke,
          ip: req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip,
          userAgent: req?.headers?.['user-agent'],
          requestId: req?.requestId,
          metadata: { reason: 'Presented rotated refresh token', family_id: familyIdToRevoke }
        });
      } catch (evtErr) {
        logger.warn('[SECURITY_MONITORING] Failed to emit reuse event:', evtErr.message);
      }

      if (req) {
        try {
          await logAdminAction({
            req,
            action: 'refresh_token_reuse_detected',
            resource_type: 'user_session_family',
            resource_id: familyIdToRevoke,
            result: 'failure',
            metadata: { user_id: userIdAlert, family_id: familyIdToRevoke }
          });
        } catch (aErr) {}
      }

      const err = new Error('Security Alert: Refresh token reuse detected. All sessions in this family have been revoked.');
      err.status = 401;
      throw err;
    }

    const notFoundErr = new Error('Invalid or expired refresh token');
    notFoundErr.status = 401;
    throw notFoundErr;
  }

  // 3. Validate session status
  if (session.revoked_at) {
    const revErr = new Error(`Session has been revoked (${session.revocation_reason || 'logout'})`);
    revErr.status = 401;
    throw revErr;
  }

  if (new Date(session.expires_at) <= now) {
    const expErr = new Error('Session has expired. Please sign in again.');
    expErr.status = 401;
    throw expErr;
  }

  // 4. Fetch associated user to confirm active status & role
  const { data: user, error: userErr } = await client
    .from('users')
    .select('id, name, email, role, admin_role, is_approved')
    .eq('id', session.user_id)
    .single();

  if (userErr || !user) {
    const uErr = new Error('User account not found');
    uErr.status = 401;
    throw uErr;
  }

  if (user.role === 'assistant' && user.is_approved !== true) {
    const appErr = new Error('Assistant account is not approved');
    appErr.status = 403;
    throw appErr;
  }

  // 5. Rotate token: Generate fresh token & hash
  const newRawRefreshToken = generateOpaqueRefreshToken();
  const newRefreshTokenHash = hashToken(newRawRefreshToken);

  // Archive old hash to rotation history for future reuse detection
  // Archive old hash to in-memory store and rotation history table
  inMemoryRotatedHashes.set(presentedHash, {
    sessionId: session.id,
    session_id: session.id,
    familyId: session.family_id,
    family_id: session.family_id,
    userId: user.id,
    user_id: user.id,
    rotatedAt: nowIso,
    expiresAt: session.expires_at
  });

  try {
    await client
      .from('refresh_token_history')
      .insert([{
        session_id: session.id,
        family_id: session.family_id,
        user_id: user.id,
        token_hash: presentedHash,
        rotated_at: nowIso,
        expires_at: session.expires_at
      }]);
  } catch (archErr) {
    // Non-blocking if table is being created
  }

  // Update session with new hash and updated activity timestamp (NEVER extend expires_at)
  const userAgent = req?.headers?.['user-agent'] || undefined;
  const ipAddress = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip || undefined;

  const updateFields = {
    refresh_token_hash: newRefreshTokenHash,
    last_activity_at: nowIso
  };
  if (userAgent) updateFields.user_agent = userAgent.slice(0, 500);
  if (ipAddress) updateFields.ip_address = ipAddress.slice(0, 100);

  const { error: updErr } = await client
    .from('user_sessions')
    .update(updateFields)
    .eq('id', session.id);

  if (updErr) {
    logger.error('Failed to rotate session refresh token:', updErr);
    throw new Error('Database error during token rotation');
  }

  // Issue new access token
  const newAccessToken = generateAccessToken({
    id: user.id,
    role: user.role,
    sid: session.id
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      admin_role: user.admin_role
    }
  };
}

/**
 * Revokes a single session by its session ID.
 *
 * @param {string} sessionId
 * @param {string} reason - 'logout' | 'admin_forced' | 'password_changed' | etc.
 * @param {object} [client]
 * @returns {Promise<boolean>}
 */
async function revokeSession(sessionId, reason = 'logout', client = defaultSupabase) {
  if (!sessionId) return false;

  const { error } = await client
    .from('user_sessions')
    .update({
      revoked_at: new Date().toISOString(),
      revocation_reason: reason
    })
    .eq('id', sessionId)
    .is('revoked_at', null);

  if (error) {
    logger.error('Error revoking session:', error);
    return false;
  }

  // Phase 6.5: Real-time Socket.IO session disconnection
  try {
    const socketSessionService = require('./socketSessionService');
    socketSessionService.disconnectSession(sessionId, reason);
  } catch (sockErr) {
    logger.error('Failed to trigger socket disconnection for session:', sockErr);
  }

  return true;
}

/**
 * Revokes all active sessions for a user.
 *
 * @param {string} userId
 * @param {string} reason - 'logout' | 'password_changed' | 'role_changed' | etc.
 * @param {object} [client]
 * @returns {Promise<number>} Number of sessions revoked
 */
async function revokeAllUserSessions(userId, reason = 'logout', client = defaultSupabase) {
  if (!userId) return 0;

  const { data, error } = await client
    .from('user_sessions')
    .update({
      revoked_at: new Date().toISOString(),
      revocation_reason: reason
    })
    .eq('user_id', userId)
    .is('revoked_at', null)
    .select('id');

  if (error) {
    logger.error('Error revoking all user sessions:', error);
    return 0;
  }

  // Phase 6.5: Real-time Socket.IO multi-device disconnection
  try {
    const socketSessionService = require('./socketSessionService');
    socketSessionService.disconnectUserSessions(userId, reason);
  } catch (sockErr) {
    logger.error('Failed to trigger user socket disconnection:', sockErr);
  }

  return data?.length || 0;
}

/**
 * Revokes all sessions belonging to a specific token family.
 *
 * @param {string} familyId
 * @param {string} reason
 * @param {object} [client]
 * @returns {Promise<number>}
 */
async function revokeFamily(familyId, reason = 'rotation_reuse_detected', client = defaultSupabase) {
  if (!familyId) return 0;

  const { data, error } = await client
    .from('user_sessions')
    .update({
      revoked_at: new Date().toISOString(),
      revocation_reason: reason
    })
    .eq('family_id', familyId)
    .is('revoked_at', null)
    .select('id');

  if (error) {
    logger.error('Error revoking session family:', error);
    return 0;
  }

  // Phase 6.5: Real-time Socket.IO token family disconnection
  try {
    const socketSessionService = require('./socketSessionService');
    socketSessionService.disconnectFamilySessions(familyId, reason);
  } catch (sockErr) {
    logger.error('Failed to trigger family socket disconnection:', sockErr);
  }

  return data?.length || 0;
}

/**
 * Lists active and past sessions for a user, returning strictly safe metadata.
 * NEVER exposes refresh_token_hash or raw tokens.
 *
 * @param {string} userId
 * @param {string} currentSessionId
 * @param {object} [client]
 * @returns {Promise<Array>} Safe session objects
 */
async function getUserSessions(userId, currentSessionId = null, client = defaultSupabase) {
  if (!userId) return [];

  const { data, error } = await client
    .from('user_sessions')
    .select('id, user_id, device_info, user_agent, ip_address, created_at, last_activity_at, expires_at, revoked_at, revocation_reason')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data) return [];

  const now = new Date();

  return data.map((s) => ({
    id: s.id,
    deviceInfo: s.device_info || 'Unknown Device',
    userAgent: s.user_agent,
    ipAddress: s.ip_address ? s.ip_address.replace(/:\d+$/, '') : 'Hidden',
    createdAt: s.created_at,
    lastActivityAt: s.last_activity_at,
    expiresAt: s.expires_at,
    revokedAt: s.revoked_at,
    revocationReason: s.revocation_reason,
    isActive: !s.revoked_at && new Date(s.expires_at) > now,
    isCurrent: currentSessionId ? s.id === currentSessionId : false
  }));
}

module.exports = {
  hashToken,
  generateOpaqueRefreshToken,
  generateAccessToken,
  createSession,
  validateSession,
  rotateRefreshToken,
  revokeSession,
  revokeAllUserSessions,
  revokeFamily,
  getUserSessions,
  ACCESS_TOKEN_EXPIRY,
  ABSOLUTE_SESSION_DAYS,
  TOKEN_ISSUER,
  TOKEN_AUDIENCE
};
