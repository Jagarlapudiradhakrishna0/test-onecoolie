/**
 * server/src/utils/generateToken.js
 *
 * ONECOOLIE Phase 6.3: JWT Generation Utility
 *
 * Supports:
 * 1. Session-bound access tokens when `sid` is provided:
 *    - Passenger: 1 hour
 *    - Assistant: 1 hour
 *    - Admin: 15 minutes
 *    - Pinned to HS256, issuer 'onecoolie-api', audience 'onecoolie-client'
 * 2. Legacy fallback mode when `sid` is omitted (30-day token for backward compatibility).
 */

const jwt = require('jsonwebtoken');

const TOKEN_ISSUER = 'onecoolie-api';
const TOKEN_AUDIENCE = 'onecoolie-client';

const EXPIRY_BY_ROLE = {
  passenger: '1h',
  assistant: '1h',
  admin: '15m'
};

const generateToken = (id, role = 'passenger', sid = null) => {
  const payload = {
    id,
    role
  };

  if (sid) {
    payload.sid = sid;
    const expiresIn = EXPIRY_BY_ROLE[role] || '1h';

    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn,
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
        algorithm: 'HS256'
      }
    );
  }

  // Legacy transition mode: 30d fallback if sid is not supplied
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: '30d',
      algorithm: 'HS256',
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE
    }
  );
};

module.exports = generateToken;