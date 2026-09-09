/**
 * ONECOOLIE PHASE 6.5: CENTRAL SOCKET SESSION SERVICE
 *
 * Manages the mapping between authenticated server-side sessions (public.user_sessions)
 * and active Socket.IO connection instances.
 *
 * Provides real-time, event-driven session revocation:
 * - Single-session disconnect (logout, admin forced revocation)
 * - Multi-session user disconnect (logout-all, password reset, role change)
 * - Token family disconnect (refresh token reuse detection)
 */

const { logger } = require('../utils/logger');

// sessionId (UUID) -> Set<Socket>
const sessionSockets = new Map();

// userId (UUID) -> Set<sessionId (UUID)>
const userSessions = new Map();

// familyId (UUID) -> Set<sessionId (UUID)>
const familySessions = new Map();

// socket.id -> { sessionId, userId, familyId }
const socketMetadata = new Map();

/**
 * Registers an authenticated socket connection with an active session.
 *
 * @param {string} sessionId
 * @param {object} socket - Socket.IO socket instance
 * @param {object} metadata - { userId: string, familyId?: string }
 */
function registerSocket(sessionId, socket, metadata = {}) {
  if (!sessionId || !socket || !socket.id) {
    logger.warn('[SOCKET_SESSION] Cannot register socket: missing sessionId or socket');
    return;
  }

  const userId = metadata.userId;
  const familyId = metadata.familyId;

  // 1. Add to sessionSockets
  if (!sessionSockets.has(sessionId)) {
    sessionSockets.set(sessionId, new Set());
  }
  sessionSockets.get(sessionId).add(socket);

  // 2. Add to userSessions
  if (userId) {
    if (!userSessions.has(userId)) {
      userSessions.set(userId, new Set());
    }
    userSessions.get(userId).add(sessionId);
  }

  // 3. Add to familySessions
  if (familyId) {
    if (!familySessions.has(familyId)) {
      familySessions.set(familyId, new Set());
    }
    familySessions.get(familyId).add(sessionId);
  }

  // 4. Store metadata for O(1) lookup on disconnect
  socketMetadata.set(socket.id, { sessionId, userId, familyId });

  // 5. Automatic cleanup on normal socket disconnect
  socket.once('disconnect', () => {
    unregisterSocket(sessionId, socket.id);
  });

  logger.info(`[SOCKET_SESSION] Registered socket ${socket.id} for session ${sessionId} (user: ${userId || 'unknown'})`);
}

/**
 * Unregisters a socket instance when it disconnects normally.
 *
 * @param {string} sessionId
 * @param {string} socketId
 */
function unregisterSocket(sessionId, socketId) {
  if (!sessionId || !socketId) return;

  const sockets = sessionSockets.get(sessionId);
  if (sockets) {
    for (const s of sockets) {
      if (s.id === socketId) {
        sockets.delete(s);
        break;
      }
    }
    if (sockets.size === 0) {
      sessionSockets.delete(sessionId);
    }
  }

  const meta = socketMetadata.get(socketId);
  socketMetadata.delete(socketId);

  // Clean up user sessions if no active sockets remain for this session
  if (!sessionSockets.has(sessionId) && meta?.userId) {
    const uSess = userSessions.get(meta.userId);
    if (uSess) {
      uSess.delete(sessionId);
      if (uSess.size === 0) {
        userSessions.delete(meta.userId);
      }
    }
  }

  // Clean up family sessions if no active sockets remain for this session
  if (!sessionSockets.has(sessionId) && meta?.familyId) {
    const fSess = familySessions.get(meta.familyId);
    if (fSess) {
      fSess.delete(sessionId);
      if (fSess.size === 0) {
        familySessions.delete(meta.familyId);
      }
    }
  }

  logger.info(`[SOCKET_SESSION] Unregistered socket ${socketId} from session ${sessionId}`);
}

/**
 * Forcibly disconnects all active sockets associated with a given session.
 * Emits 'session-revoked' event to each socket before invoking disconnect(true).
 *
 * @param {string} sessionId
 * @param {string} reason
 * @returns {number} Number of disconnected sockets
 */
function disconnectSession(sessionId, reason = 'logout') {
  if (!sessionId) return 0;

  const sockets = sessionSockets.get(sessionId);
  if (!sockets || sockets.size === 0) {
    sessionSockets.delete(sessionId);
    // Also ensure it's removed from userSessions & familySessions
    for (const [uId, sSet] of userSessions.entries()) {
      sSet.delete(sessionId);
      if (sSet.size === 0) userSessions.delete(uId);
    }
    for (const [fId, sSet] of familySessions.entries()) {
      sSet.delete(sessionId);
      if (sSet.size === 0) familySessions.delete(fId);
    }
    return 0;
  }

  let count = 0;
  for (const socket of sockets) {
    const meta = socketMetadata.get(socket.id);
    if (meta?.userId) {
      const uSess = userSessions.get(meta.userId);
      if (uSess) {
        uSess.delete(sessionId);
        if (uSess.size === 0) userSessions.delete(meta.userId);
      }
    }
    if (meta?.familyId) {
      const fSess = familySessions.get(meta.familyId);
      if (fSess) {
        fSess.delete(sessionId);
        if (fSess.size === 0) familySessions.delete(meta.familyId);
      }
    }

    try {
      socket.emit('session-revoked', {
        reason: sanitizeReason(reason),
        sessionId,
        timestamp: new Date().toISOString()
      });
      socket.disconnect(true);
      count++;
    } catch (err) {
      logger.error(`[SOCKET_SESSION] Error disconnecting socket ${socket.id}:`, err);
    } finally {
      socketMetadata.delete(socket.id);
    }
  }

  sessionSockets.delete(sessionId);
  logger.warn(`[SOCKET_SESSION] Terminated ${count} active socket(s) for revoked session ${sessionId} (reason: ${reason})`);
  return count;
}

/**
 * Forcibly disconnects all sockets associated with any session of a given user.
 *
 * @param {string} userId
 * @param {string} reason
 * @returns {number} Total number of disconnected sockets
 */
function disconnectUserSessions(userId, reason = 'logout') {
  if (!userId) return 0;

  let totalDisconnected = 0;
  const sessions = userSessions.get(userId);

  if (sessions) {
    for (const sessionId of Array.from(sessions)) {
      totalDisconnected += disconnectSession(sessionId, reason);
    }
    userSessions.delete(userId);
  }

  // Check any dangling sockets for this user in metadata
  for (const [sId, meta] of socketMetadata.entries()) {
    if (meta.userId === userId) {
      totalDisconnected += disconnectSession(meta.sessionId, reason);
    }
  }

  logger.warn(`[SOCKET_SESSION] Terminated all sockets (${totalDisconnected}) for user ${userId} (reason: ${reason})`);
  return totalDisconnected;
}

/**
 * Forcibly disconnects all sockets associated with a token family (e.g. rotation reuse detected).
 *
 * @param {string} familyId
 * @param {string} reason
 * @returns {number} Total number of disconnected sockets
 */
function disconnectFamilySessions(familyId, reason = 'rotation_reuse_detected') {
  if (!familyId) return 0;

  let totalDisconnected = 0;
  const sessions = familySessions.get(familyId);

  if (sessions) {
    for (const sessionId of Array.from(sessions)) {
      totalDisconnected += disconnectSession(sessionId, reason);
    }
    familySessions.delete(familyId);
  }

  for (const [sId, meta] of socketMetadata.entries()) {
    if (meta.familyId === familyId) {
      totalDisconnected += disconnectSession(meta.sessionId, reason);
    }
  }

  logger.warn(`[SOCKET_SESSION] Terminated all sockets (${totalDisconnected}) for token family ${familyId} (reason: ${reason})`);
  return totalDisconnected;
}

function sanitizeReason(reason) {
  const allowed = [
    'logout',
    'admin_forced',
    'password_changed',
    'role_changed',
    'rotation_reuse_detected',
    'expired'
  ];
  return allowed.includes(reason) ? reason : 'session_revoked';
}

function getActiveSocketCount(sessionId) {
  return sessionSockets.get(sessionId)?.size || 0;
}

function getUserSocketCount(userId) {
  const sessions = userSessions.get(userId);
  if (!sessions) return 0;
  let count = 0;
  for (const sid of sessions) {
    count += getActiveSocketCount(sid);
  }
  return count;
}

function clearAll() {
  sessionSockets.clear();
  userSessions.clear();
  familySessions.clear();
  socketMetadata.clear();
}

module.exports = {
  registerSocket,
  unregisterSocket,
  disconnectSession,
  disconnectUserSessions,
  disconnectFamilySessions,
  getActiveSocketCount,
  getUserSocketCount,
  clearAll
};
