/**
 * server/src/services/mfaService.js
 *
 * ONECOOLIE Phase 6.2: High-Security Multi-Factor Authentication (TOTP) Service
 *
 * Security Guarantees & Implementation Rules:
 * 1. TOTP secrets are NEVER stored in plaintext. They are encrypted at rest
 *    using AES-256-GCM with a 32-byte key (MFA_ENCRYPTION_KEY).
 * 2. Each encryption generates a fresh, cryptographically secure 12-byte IV.
 * 3. Decryption verifies the GCM 16-byte authentication tag (integrity guarantee).
 * 4. Recovery codes are generated with high entropy and stored exclusively as
 *    bcrypt hashes (cost factor 10). Plaintext recovery codes are presented ONCE.
 * 5. TOTP verification strictly enforces standard RFC 6238 timing window (window: 1).
 * 6. Secrets, codes, and encryption components are deeply masked and never logged.
 */

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const defaultSupabase = require('../config/db');
const { logger } = require('../utils/logger');

// App name for TOTP authenticator display
const MFA_ISSUER = process.env.MFA_ISSUER || 'ONECOOLIE Ops Console';

/**
 * Derives or validates the 32-byte AES-256-GCM encryption key.
 * Accepts either:
 * - A 64-character hex string (32 bytes)
 * - A 32-character raw UTF-8 string
 * - Falls back to a deterministic SHA-256 derivation of process.env.JWT_SECRET in development only
 *   if MFA_ENCRYPTION_KEY is not explicitly set.
 *
 * @returns {Buffer} 32-byte Buffer
 */
function getEncryptionKey() {
  const rawKey = process.env.MFA_ENCRYPTION_KEY;

  if (rawKey && typeof rawKey === 'string' && rawKey.trim().length > 0) {
    const trimmed = rawKey.trim();
    // Check if 64-char hex
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Buffer.from(trimmed, 'hex');
    }
    // Check if 32-byte utf-8 string
    const buf = Buffer.from(trimmed, 'utf8');
    if (buf.length === 32) {
      return buf;
    }
    // Hash key to 32 bytes if provided but non-standard length
    return crypto.createHash('sha256').update(trimmed).digest();
  }

  // Fallback for development if MFA_ENCRYPTION_KEY is not set
  if (process.env.NODE_ENV !== 'production' && process.env.JWT_SECRET) {
    logger.warn('[MFA_SERVICE] MFA_ENCRYPTION_KEY not explicitly set. Deriving 32-byte key from JWT_SECRET for development.');
    return crypto.createHash('sha256').update(process.env.JWT_SECRET + '::MFA_ENCRYPTION_SALT').digest();
  }

  throw new Error('MFA Security Failure: MFA_ENCRYPTION_KEY must be configured as a 32-byte key.');
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @param {string} plaintext
 * @returns {{ encrypted_secret: string, secret_iv: string, secret_tag: string }}
 */
function encryptSecret(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext secret is required for encryption');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    encrypted_secret: encrypted,
    secret_iv: iv.toString('hex'),
    secret_tag: tag.toString('hex')
  };
}

/**
 * Decrypts an AES-256-GCM encrypted record and verifies the authentication tag.
 *
 * @param {{ encrypted_secret: string, secret_iv: string, secret_tag: string }} record
 * @returns {string} plaintext secret
 */
function decryptSecret(record) {
  if (!record || !record.encrypted_secret || !record.secret_iv || !record.secret_tag) {
    throw new Error('Invalid encrypted MFA record payload');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(record.secret_iv, 'hex');
  const tag = Buffer.from(record.secret_tag, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(record.encrypted_secret, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates a standard base32 TOTP secret.
 *
 * @param {string} userEmail
 * @returns {{ base32: string, otpauth_url: string }}
 */
function generateTOTPSecret(userEmail) {
  const secret = speakeasy.generateSecret({
    name: `${MFA_ISSUER} (${userEmail})`,
    issuer: MFA_ISSUER,
    length: 20
  });

  return {
    base32: secret.base32,
    otpauth_url: secret.otpauth_url
  };
}

/**
 * Generates 8 cryptographically random recovery codes (format: xxxx-xxxx).
 *
 * @returns {string[]} Array of 8 plaintext codes
 */
function generateRecoveryCodes() {
  const codes = [];
  for (let i = 0; i < 8; i++) {
    const part1 = crypto.randomBytes(2).toString('hex');
    const part2 = crypto.randomBytes(2).toString('hex');
    codes.push(`${part1}-${part2}`.toUpperCase());
  }
  return codes;
}

/**
 * Hashes a plaintext recovery code with bcrypt.
 *
 * @param {string} code
 * @returns {Promise<string>}
 */
async function hashRecoveryCode(code) {
  const normalized = code.trim().toUpperCase();
  return bcrypt.hash(normalized, 10);
}

/**
 * Initializes or updates an unenrolled MFA setup record for an admin.
 *
 * @param {object} user - { id, email }
 * @param {object} [client] - Supabase client
 * @returns {Promise<{ otpauth_url: string, qr_code_data_url: string }>}
 */
async function createEnrollment(user, client = defaultSupabase) {
  if (!user || !user.id || !user.email) {
    throw new Error('User context required for MFA enrollment');
  }

  // Check if admin is already enrolled
  const { data: existing, error: checkErr } = await client
    .from('admin_mfa')
    .select('id, is_enrolled')
    .eq('user_id', user.id)
    .maybeSingle();

  if (checkErr) {
    logger.error('MFA createEnrollment DB lookup error:', checkErr);
    throw new Error('Database error inspecting existing MFA state');
  }

  if (existing && existing.is_enrolled) {
    throw new Error('Admin account is already enrolled in Multi-Factor Authentication. Accidental re-enrollment rejected.');
  }

  // 1. Generate fresh secret
  const { base32, otpauth_url } = generateTOTPSecret(user.email);

  // 2. Encrypt secret with AES-256-GCM
  const { encrypted_secret, secret_iv, secret_tag } = encryptSecret(base32);

  // 3. Upsert into admin_mfa as unenrolled
  const { error: upsertErr } = await client
    .from('admin_mfa')
    .upsert({
      user_id: user.id,
      encrypted_secret,
      secret_iv,
      secret_tag,
      is_enrolled: false,
      enrolled_at: null,
      verified_at: null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (upsertErr) {
    logger.error('MFA createEnrollment DB insert error:', upsertErr);
    throw new Error('Failed to record MFA enrollment setup');
  }

  // 4. Generate QR code Data URL for frontend scanning
  const qr_code_data_url = await QRCode.toDataURL(otpauth_url);

  return {
    otpauth_url,
    qr_code_data_url
  };
}

/**
 * Verifies the first TOTP code during enrollment and activates MFA.
 * Generates and returns 8 one-time backup recovery codes.
 *
 * @param {string} userId
 * @param {string} token - 6-digit TOTP code
 * @param {object} [client]
 * @returns {Promise<{ success: boolean, recoveryCodes: string[] }>}
 */
async function verifyEnrollmentCode(userId, token, client = defaultSupabase) {
  if (!userId || !token) {
    throw new Error('User ID and TOTP token are required');
  }

  const cleanToken = String(token).replace(/\D/g, '').trim();
  if (cleanToken.length !== 6) {
    return { success: false, reason: 'TOTP code must be 6 digits' };
  }

  // Fetch unenrolled record
  const { data: record, error: fetchErr } = await client
    .from('admin_mfa')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchErr || !record) {
    return { success: false, reason: 'MFA setup record not found' };
  }

  if (record.is_enrolled) {
    return { success: false, reason: 'MFA is already actively enrolled' };
  }

  // Decrypt secret
  let plaintextSecret;
  try {
    plaintextSecret = decryptSecret(record);
  } catch (decErr) {
    logger.error('MFA secret decryption failed:', decErr.message);
    throw new Error('MFA cryptographic verification failed');
  }

  // Verify TOTP code (window = 1 -> current 30s step +/- 1)
  const isValid = speakeasy.totp.verify({
    secret: plaintextSecret,
    encoding: 'base32',
    token: cleanToken,
    window: 1
  });

  if (!isValid) {
    return { success: false, reason: 'Invalid TOTP code' };
  }

  const nowIso = new Date().toISOString();

  // Mark record as enrolled
  const { error: enrollErr } = await client
    .from('admin_mfa')
    .update({
      is_enrolled: true,
      enrolled_at: nowIso,
      verified_at: nowIso,
      updated_at: nowIso
    })
    .eq('user_id', userId);

  if (enrollErr) {
    logger.error('MFA enrollment update error:', enrollErr);
    throw new Error('Failed to activate MFA enrollment');
  }

  // Generate 8 recovery codes
  const plainRecoveryCodes = generateRecoveryCodes();

  // Delete any old unused recovery codes for this user
  await client
    .from('mfa_recovery_codes')
    .delete()
    .eq('user_id', userId);

  // Hash and insert recovery codes
  const codeInserts = await Promise.all(
    plainRecoveryCodes.map(async (code) => {
      const code_hash = await hashRecoveryCode(code);
      return {
        user_id: userId,
        code_hash,
        is_used: false,
        created_at: nowIso
      };
    })
  );

  const { error: insCodeErr } = await client
    .from('mfa_recovery_codes')
    .insert(codeInserts);

  if (insCodeErr) {
    logger.error('MFA recovery codes insertion error:', insCodeErr);
    throw new Error('Failed to store backup recovery codes');
  }

  return {
    success: true,
    recoveryCodes: plainRecoveryCodes
  };
}

/**
 * Verifies a TOTP token during the login challenge flow.
 *
 * @param {string} userId
 * @param {string} token - 6-digit TOTP code
 * @param {object} [client]
 * @returns {Promise<{ valid: boolean, reason?: string }>}
 */
async function verifyLoginCode(userId, token, client = defaultSupabase) {
  if (!userId || !token) {
    return { valid: false, reason: 'Missing user ID or token' };
  }

  const cleanToken = String(token).replace(/\D/g, '').trim();
  if (cleanToken.length !== 6) {
    return { valid: false, reason: 'Invalid token format' };
  }

  const { data: record, error: fetchErr } = await client
    .from('admin_mfa')
    .select('*')
    .eq('user_id', userId)
    .eq('is_enrolled', true)
    .maybeSingle();

  if (fetchErr || !record) {
    return { valid: false, reason: 'Enrolled MFA record not found' };
  }

  let plaintextSecret;
  try {
    plaintextSecret = decryptSecret(record);
  } catch (decErr) {
    logger.error('MFA secret decryption failed:', decErr.message);
    return { valid: false, reason: 'Cryptographic failure verifying MFA' };
  }

  const isValid = speakeasy.totp.verify({
    secret: plaintextSecret,
    encoding: 'base32',
    token: cleanToken,
    window: 1
  });

  if (isValid) {
    const nowIso = new Date().toISOString();
    await client
      .from('admin_mfa')
      .update({
        verified_at: nowIso,
        updated_at: nowIso
      })
      .eq('user_id', userId);

    return { valid: true };
  }

  return { valid: false, reason: 'Incorrect TOTP code' };
}

/**
 * Verifies and atomically burns an emergency one-time recovery code.
 *
 * @param {string} userId
 * @param {string} code - Plaintext code (e.g., 'ABCD-1234')
 * @param {object} [client]
 * @returns {Promise<{ valid: boolean, reason?: string }>}
 */
async function verifyRecoveryCode(userId, code, client = defaultSupabase) {
  if (!userId || !code) {
    return { valid: false, reason: 'Missing user ID or code' };
  }

  const cleanCode = String(code).trim().toUpperCase();

  // Fetch all unused recovery codes for this admin
  const { data: records, error: fetchErr } = await client
    .from('mfa_recovery_codes')
    .select('id, code_hash')
    .eq('user_id', userId)
    .eq('is_used', false);

  if (fetchErr || !records || records.length === 0) {
    return { valid: false, reason: 'No unused recovery codes available' };
  }

  // Iterate and compare bcrypt hashes
  for (const item of records) {
    const isMatch = await bcrypt.compare(cleanCode, item.code_hash);
    if (isMatch) {
      // Atomically mark code as used
      const nowIso = new Date().toISOString();
      const { error: burnErr } = await client
        .from('mfa_recovery_codes')
        .update({
          is_used: true,
          used_at: nowIso
        })
        .eq('id', item.id)
        .eq('is_used', false); // Atomic idempotency guard

      if (burnErr) {
        logger.error('Error burning used recovery code:', burnErr);
        return { valid: false, reason: 'Failed to invalidate recovery code' };
      }

      // Update verified_at on admin_mfa
      await client
        .from('admin_mfa')
        .update({
          verified_at: nowIso,
          updated_at: nowIso
        })
        .eq('user_id', userId);

      return { valid: true };
    }
  }

  return { valid: false, reason: 'Invalid recovery code' };
}

/**
 * Regenerates all backup recovery codes for an enrolled admin.
 * Requires that MFA is actively enrolled.
 *
 * @param {string} userId
 * @param {object} [client]
 * @returns {Promise<{ success: boolean, recoveryCodes: string[] }>}
 */
async function regenerateRecoveryCodes(userId, client = defaultSupabase) {
  if (!userId) throw new Error('User ID required');

  const { data: record, error } = await client
    .from('admin_mfa')
    .select('id, is_enrolled')
    .eq('user_id', userId)
    .eq('is_enrolled', true)
    .maybeSingle();

  if (error || !record) {
    throw new Error('Admin MFA is not enrolled. Cannot regenerate recovery codes.');
  }

  const plainRecoveryCodes = generateRecoveryCodes();
  const nowIso = new Date().toISOString();

  // Invalidate previous codes
  await client
    .from('mfa_recovery_codes')
    .delete()
    .eq('user_id', userId);

  // Store new hashes
  const codeInserts = await Promise.all(
    plainRecoveryCodes.map(async (code) => {
      const code_hash = await hashRecoveryCode(code);
      return {
        user_id: userId,
        code_hash,
        is_used: false,
        created_at: nowIso
      };
    })
  );

  const { error: insErr } = await client
    .from('mfa_recovery_codes')
    .insert(codeInserts);

  if (insErr) {
    logger.error('Failed to insert regenerated recovery codes:', insErr);
    throw new Error('Failed to persist regenerated recovery codes');
  }

  return {
    success: true,
    recoveryCodes: plainRecoveryCodes
  };
}

/**
 * Checks MFA enrollment status for a user.
 *
 * @param {string} userId
 * @param {object} [client]
 * @returns {Promise<{ enrolled: boolean, enrolledAt: string|null }>}
 */
async function getMfaStatus(userId, client = defaultSupabase) {
  if (!userId) return { enrolled: false, enrolledAt: null };

  const { data, error } = await client
    .from('admin_mfa')
    .select('is_enrolled, enrolled_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return { enrolled: false, enrolledAt: null };
  }

  return {
    enrolled: !!data.is_enrolled,
    enrolledAt: data.enrolled_at || null
  };
}

module.exports = {
  encryptSecret,
  decryptSecret,
  generateTOTPSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  createEnrollment,
  verifyEnrollmentCode,
  verifyLoginCode,
  verifyRecoveryCode,
  regenerateRecoveryCodes,
  getMfaStatus
};
