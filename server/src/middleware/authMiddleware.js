/**
 * server/src/middleware/authMiddleware.js
 *
 * ONECOOLIE Phase 6.3: High-Security Session-Authoritative Authentication Middleware
 *
 * Security Architecture & Validation Rules:
 * 1. Bearer Token Extraction:
 *    Extracts token from standard Authorization header (or x-access-token / x-auth-token).
 * 2. Cryptographic & Claims Verification:
 *    Pins algorithm to HS256, verifies against JWT_SECRET, and checks expiration.
 * 3. Scope Isolation:
 *    Explicitly rejects intermediate MFA challenge tokens (`mfa_pending`, `mfa_setup_required`).
 * 4. Server-Side Session Validation:
 *    If access token contains `sid` (session UUID):
 *    - Looks up session in `public.user_sessions`.
 *    - Confirms `session.user_id === decoded.id`.
 *    - Confirms `session.revoked_at IS NULL`.
 *    - Confirms `session.expires_at > NOW()`.
 *    - Rejects immediately if revoked or expired.
 * 5. Legacy Token Compatibility Window:
 *    If `sid` is omitted (legacy 30-day tokens issued prior to Phase 6.3),
 *    validates cryptographically to prevent breaking existing logged-in clients.
 *    (This legacy path will naturally retire as 30-day tokens expire).
 */

const jwt = require('jsonwebtoken');
const supabase = require('../config/db');

const TOKEN_ISSUER = 'onecoolie-api';
const TOKEN_AUDIENCE = 'onecoolie-client';

const protect = async (req, res, next) => {
  const authHeader =
    req.headers.authorization ||
    req.headers.Authorization ||
    req.headers['x-access-token'] ||
    req.headers['x-auth-token'];

  if (authHeader && typeof authHeader === 'string') {
    try {
      let token = authHeader.trim();
      if (/^Bearer\s+/i.test(token)) {
        token = token.replace(/^Bearer\s+/i, '').trim();
      }
      token = token.replace(/^"(.*)"$/, '$1').trim();

      if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
      }

      // 1. Verify cryptographic signature & algorithm pinning
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256']
      });

      // 2. Reject intermediate MFA challenge tokens from accessing standard API endpoints
      if (decoded && (decoded.scope === 'mfa_pending' || decoded.scope === 'mfa_setup_required')) {
        return res.status(401).json({ message: 'Authentication error: MFA verification required' });
      }

      // 3. Server-Side Session Verification (if sid claim is present)
      if (decoded && decoded.sid) {
        const { data: session, error: sessErr } = await supabase
          .from('user_sessions')
          .select('id, user_id, expires_at, revoked_at, revocation_reason')
          .eq('id', decoded.sid)
          .maybeSingle();

        if (sessErr || !session) {
          return res.status(401).json({ message: 'Session not found or invalid' });
        }

        if (session.user_id !== decoded.id) {
          return res.status(401).json({ message: 'Session identity mismatch' });
        }

        if (session.revoked_at) {
          return res.status(401).json({
            message: `Session has been revoked (${session.revocation_reason || 'logged out'}). Please sign in again.`
          });
        }

        if (new Date(session.expires_at) <= new Date()) {
          return res.status(401).json({ message: 'Session expired. Please sign in again.' });
        }

        // Attach verified session ID to request
        req.sessionId = session.id;
      }

      req.user = decoded; // Makes req.user.id and req.user.role available to controllers
      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Not authorized, token expired' });
      }
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

const optionalProtect = async (req, res, next) => {
  const authHeader =
    req.headers.authorization ||
    req.headers.Authorization ||
    req.headers['x-access-token'] ||
    req.headers['x-auth-token'];

  if (authHeader && typeof authHeader === 'string') {
    try {
      let token = authHeader.trim();
      if (/^Bearer\s+/i.test(token)) {
        token = token.replace(/^Bearer\s+/i, '').trim();
      }
      token = token.replace(/^"(.*)"$/, '$1').trim();

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
          algorithms: ['HS256']
        });

        if (decoded && decoded.scope !== 'mfa_pending' && decoded.scope !== 'mfa_setup_required') {
          // If sid exists, ensure session is not revoked
          if (decoded.sid) {
            const { data: session } = await supabase
              .from('user_sessions')
              .select('id, user_id, expires_at, revoked_at')
              .eq('id', decoded.sid)
              .maybeSingle();

            if (session && !session.revoked_at && new Date(session.expires_at) > new Date()) {
              req.user = decoded;
              req.sessionId = session.id;
            }
          } else {
            // Legacy token fallback
            req.user = decoded;
          }
        }
      }
    } catch (error) {
      // Gracefully continue without authenticated user
    }
  }
  return next();
};

module.exports = { protect, optionalProtect };