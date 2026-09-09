/**
 * server/src/config/environment.js
 *
 * Centralized Production Environment Validation & Configuration (Phase 6)
 *
 * Ensures all required environment variables are strictly validated on startup.
 * Fails safely if critical configuration is missing in production.
 *
 * STRICT SECURITY: Never logs, outputs, or exposes secret values.
 * Only reports missing or invalid environment variable names.
 */

const isProduction = () => (process.env.NODE_ENV || '').toLowerCase() === 'production';

/**
 * Checks if online payments via Razorpay are fully configured.
 * @returns {boolean}
 */
const isOnlinePaymentConfigured = () => {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const whSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  return keyId.length > 0 && keySecret.length > 0 && whSecret.length > 0;
};

/**
 * Detects whether Razorpay is running in 'live', 'test', or unconfigured mode.
 * @returns {'live' | 'test' | 'configured_custom' | 'none'}
 */
const getRazorpayMode = () => {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  if (keyId.startsWith('rzp_live_')) return 'live';
  if (keyId.startsWith('rzp_test_')) return 'test';
  if (keyId.length > 0) return 'configured_custom';
  return 'none';
};

/**
 * Parses and returns the sanitized list of allowed CORS origins.
 * Trims whitespace, strips trailing slashes, and filters wildcards.
 * Localhost origins are included ONLY in non-production environments.
 * @returns {string[]}
 */
const getAllowedOrigins = () => {
  const origins = [];
  const prod = isProduction();

  const rawOrigins = [
    process.env.ALLOWED_ORIGINS,
    process.env.CORS_ORIGINS,
    process.env.CLIENT_URL
  ].filter(Boolean).join(',');

  rawOrigins.split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)
    .forEach((o) => {
      // In production, reject wildcard '*' as it is forbidden with credentials: true
      if (prod && o === '*') return;
      if (!origins.includes(o)) origins.push(o);
    });

  // Include local development origins ONLY in non-production environments
  if (!prod) {
    const devDefaults = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];
    for (const d of devDefaults) {
      if (!origins.includes(d)) origins.push(d);
    }
  }

  return origins;
};

const INSECURE_PLACEHOLDERS = new Set([
  'your-secure-random-32-byte-hex-string',
  'your-jwt-secret-key',
  'your-supabase-service-role-secret-key',
  'your-supabase-publishable-key',
  'your-live-razorpay-key-secret',
  'your-live-webhook-hmac-secret',
  'your-rapidapi-key',
  'your-brevo-api-key',
  'your-resend-api-key',
  'your-mfa-encryption-key-hex',
  'your-64-character-hex-mfa-encryption-key',
  'your-mfa-encryption-key',
  'secret',
  'password',
  'changeme',
  '12345678',
  'default-secret'
]);

/**
 * Validates the runtime environment according to deployment target.
 *
 * @param {object} [options={}]
 * @param {boolean} [options.exitOnFailure=false] - Whether to throw or exit process on failure
 * @returns {{ valid: boolean, errors: string[], missing: string[], warnings: string[], mode: string }}
 */
function validateEnvironment(options = {}) {
  const { exitOnFailure = false } = options;
  const errors = [];
  const missing = [];
  const warnings = [];
  const prod = isProduction();

  // Core base variables required across all environments
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 16) {
    errors.push('JWT_SECRET must be set with at least 16 characters for cryptographic security.');
    missing.push('JWT_SECRET');
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_URL.startsWith('http')) {
    errors.push('SUPABASE_URL is missing or does not start with http(s)://.');
    missing.push('SUPABASE_URL');
  }

  if (!process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY.trim().length < 10) {
    errors.push('SUPABASE_SECRET_KEY is missing or too short.');
    missing.push('SUPABASE_SECRET_KEY');
  }

  // Production-specific requirements and placeholder rejection
  if (prod) {
    if (process.env.JWT_SECRET && INSECURE_PLACEHOLDERS.has(process.env.JWT_SECRET.trim().toLowerCase())) {
      errors.push('JWT_SECRET uses an insecure known placeholder value in production.');
    }
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production for cryptographic entropy.');
    }
    if (process.env.SUPABASE_SECRET_KEY && INSECURE_PLACEHOLDERS.has(process.env.SUPABASE_SECRET_KEY.trim().toLowerCase())) {
      errors.push('SUPABASE_SECRET_KEY uses an insecure known placeholder value in production.');
    }
    if (process.env.RAZORPAY_KEY_SECRET && INSECURE_PLACEHOLDERS.has(process.env.RAZORPAY_KEY_SECRET.trim().toLowerCase())) {
      errors.push('RAZORPAY_KEY_SECRET uses an insecure known placeholder value in production.');
    }

    // Production MFA Encryption Key Validation
    if (!process.env.MFA_ENCRYPTION_KEY || process.env.MFA_ENCRYPTION_KEY.trim().length === 0) {
      errors.push('MFA_ENCRYPTION_KEY is required in production for AES-256-GCM TOTP secret encryption.');
      missing.push('MFA_ENCRYPTION_KEY');
    } else {
      const mfaKey = process.env.MFA_ENCRYPTION_KEY.trim();
      const isHex64 = /^[0-9a-fA-F]{64}$/.test(mfaKey);
      const isUtf8_32 = Buffer.from(mfaKey, 'utf8').length === 32;
      if (!isHex64 && !isUtf8_32) {
        errors.push('MFA_ENCRYPTION_KEY in production must be a 64-character hex string (32 bytes) or 32-byte key.');
      }
      if (INSECURE_PLACEHOLDERS.has(mfaKey.toLowerCase())) {
        errors.push('MFA_ENCRYPTION_KEY uses an insecure known placeholder value in production.');
      }
    }

    const corsList = getAllowedOrigins();
    if (corsList.length === 0) {
      errors.push('Production environment requires at least one explicit origin in ALLOWED_ORIGINS, CORS_ORIGINS or CLIENT_URL.');
      missing.push('ALLOWED_ORIGINS');
    }

    // In production, if online payments are enabled or keys partially present
    const hasKeyId = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID.trim());
    const hasKeySecret = Boolean(process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_SECRET.trim());
    const hasWhSecret = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET.trim());

    if (hasKeyId || hasKeySecret || hasWhSecret) {
      if (!hasKeyId) { errors.push('Missing RAZORPAY_KEY_ID for production online payment flow.'); missing.push('RAZORPAY_KEY_ID'); }
      if (!hasKeySecret) { errors.push('Missing RAZORPAY_KEY_SECRET for production online payment flow.'); missing.push('RAZORPAY_KEY_SECRET'); }
      if (!hasWhSecret) { errors.push('Missing RAZORPAY_WEBHOOK_SECRET for production online payment flow.'); missing.push('RAZORPAY_WEBHOOK_SECRET'); }
    } else {
      warnings.push('Razorpay credentials not set; running in cash-only mode in production.');
    }
  } else {
    // Development warnings
    if (!isOnlinePaymentConfigured()) {
      warnings.push('Razorpay credentials are incomplete; online payment flow disabled (cash-only active).');
    }
  }

  const valid = errors.length === 0;

  if (!valid && exitOnFailure) {
    console.error('\n❌ CRITICAL: Environment configuration is invalid!');
    errors.forEach((err) => console.error(`   • ${err}`));
    console.error('\nServer startup aborted. Fix the missing or invalid environment variables above.\n');
    throw new Error(`Environment configuration invalid: ${errors.join('; ')}`);
  }

  return {
    valid,
    mode: prod ? 'production' : 'development',
    errors,
    missing,
    warnings
  };
}

/**
 * Returns safe environment diagnostic summary with ZERO secret exposure.
 * @returns {object}
 */
function getEnvironmentDiagnostics() {
  const prod = isProduction();
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const razorpayMode = getRazorpayMode();

  return {
    node_env: process.env.NODE_ENV || 'development',
    is_production: prod,
    port: parseInt(process.env.PORT, 10) || 5000,
    has_jwt_secret: Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16),
    has_mfa_encryption_key: Boolean(process.env.MFA_ENCRYPTION_KEY && process.env.MFA_ENCRYPTION_KEY.trim().length > 0),
    has_supabase_url: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_URL.startsWith('http')),
    has_supabase_secret_key: Boolean(process.env.SUPABASE_SECRET_KEY && process.env.SUPABASE_SECRET_KEY.trim().length > 0),
    cookie_auth: {
      enabled: true,
      secure: prod || process.env.COOKIE_SECURE === 'true',
      same_site: process.env.COOKIE_SAME_SITE || (prod ? 'none' : 'lax'),
      cookie_name: process.env.COOKIE_NAME || 'onecoolie_refresh'
    },
    supabase: {
      has_url: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_URL.startsWith('http')),
      has_secret_key: Boolean(process.env.SUPABASE_SECRET_KEY && process.env.SUPABASE_SECRET_KEY.trim().length > 0),
      has_anon_key: Boolean(process.env.SUPABASE_KEY && process.env.SUPABASE_KEY.trim().length > 0)
    },
    razorpay: {
      configured: isOnlinePaymentConfigured(),
      has_key_id: Boolean(keyId),
      has_key_secret: Boolean(process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_SECRET.trim().length > 0),
      has_webhook_secret: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET.trim().length > 0),
      mode: razorpayMode
    },
    cors: {
      allowed_origins: getAllowedOrigins(),
      origins_count: getAllowedOrigins().length,
      has_explicit_allowlist: getAllowedOrigins().length > 0
    },
    settlement: {
      settlement_hours: parseInt(process.env.ASSISTANT_SETTLEMENT_HOURS, 10) || 0,
      minimum_payout: parseInt(process.env.MINIMUM_PAYOUT_AMOUNT, 10) || 100
    }
  };
}

module.exports = {
  isProduction,
  isOnlinePaymentConfigured,
  getRazorpayMode,
  getAllowedOrigins,
  validateEnvironment,
  getEnvironmentDiagnostics
};
