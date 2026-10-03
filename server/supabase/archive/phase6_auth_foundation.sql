-- ==============================================================================
-- ONECOOLIE / RAILMITRA — SECURITY PHASE 6.1 DATABASE MIGRATION
-- Secure Authentication Database Foundation:
-- Sessions, Admin MFA, Recovery Codes, and Account Lockout Telemetry
--
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/pzrttunhyfporcpcybax/sql
-- ==============================================================================

-- Enable UUID generation extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. UPDATE public.users (Account Lockout & Authentication Telemetry)
-- ==============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_password_change_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure failed_login_attempts is never negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_users_failed_login_attempts'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT chk_users_failed_login_attempts
      CHECK (failed_login_attempts >= 0);
  END IF;
END $$;

-- Partial index for active account lockouts (O(1) lockout status evaluation)
CREATE INDEX IF NOT EXISTS idx_users_locked_until
  ON public.users(locked_until)
  WHERE locked_until IS NOT NULL;

-- ==============================================================================
-- 2. CREATE public.user_sessions (Server-Side Session Store & Token Rotation)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL DEFAULT gen_random_uuid(),
    refresh_token_hash TEXT NOT NULL,
    device_info TEXT,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ DEFAULT NULL,
    revocation_reason TEXT DEFAULT NULL
);

-- Constraint for valid revocation reasons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_user_sessions_revocation_reason'
  ) THEN
    ALTER TABLE public.user_sessions
      ADD CONSTRAINT chk_user_sessions_revocation_reason
      CHECK (
        revocation_reason IS NULL OR revocation_reason IN (
          'logout',
          'rotation_reuse_detected',
          'admin_forced',
          'role_changed',
          'password_changed',
          'expired'
        )
      );
  END IF;
END $$;

-- Indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
  ON public.user_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_family_id
  ON public.user_sessions(family_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash
  ON public.user_sessions(refresh_token_hash);

-- Performance partial index for non-revoked session lookups
-- (Note: NOW() is not immutable, so we index (user_id, expires_at) WHERE revoked_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_lookup
  ON public.user_sessions(user_id, expires_at)
  WHERE revoked_at IS NULL;

-- ==============================================================================
-- 3. CREATE public.admin_mfa (Dedicated Admin TOTP Configuration Store)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.admin_mfa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    encrypted_secret TEXT NOT NULL,
    secret_iv TEXT NOT NULL,
    secret_tag TEXT NOT NULL,
    is_enrolled BOOLEAN NOT NULL DEFAULT FALSE,
    enrolled_at TIMESTAMPTZ DEFAULT NULL,
    verified_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: user_id UUID UNIQUE in table DDL automatically creates a unique constraint/index.
-- An explicit UNIQUE INDEX IF NOT EXISTS ensures a canonical index identifier idx_admin_mfa_user_id without duplicating indexing overhead.
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_mfa_user_id
  ON public.admin_mfa(user_id);

-- Automatic updated_at trigger for admin_mfa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_set_timestamp_admin_mfa'
  ) THEN
    CREATE TRIGGER trg_set_timestamp_admin_mfa
    BEFORE UPDATE ON public.admin_mfa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ==============================================================================
-- 4. CREATE public.mfa_recovery_codes (One-Time Emergency Backup Codes)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.mfa_recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_mfa_recovery_codes_user_code UNIQUE (user_id, code_hash)
);

-- Partial index for fast validation of unused recovery codes
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_unused
  ON public.mfa_recovery_codes(user_id)
  WHERE is_used = FALSE;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Defense-in-Depth Perimeter Protection
-- ==============================================================================

-- Enable RLS on all Phase 6.1 tables
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_mfa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

-- 5.1 user_sessions RLS:
-- Restrict direct table access strictly to backend service_role.
-- Frontend clients must NOT access this table directly to prevent exposure of refresh_token_hash.
-- Safe session metadata inspection will be exposed via dedicated backend API endpoints.
DROP POLICY IF EXISTS "Service role full access on user_sessions" ON public.user_sessions;
CREATE POLICY "Service role full access on user_sessions"
  ON public.user_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5.2 admin_mfa RLS:
-- Confidential TOTP secrets must NEVER be readable by anonymous or standard authenticated roles.
DROP POLICY IF EXISTS "Service role full access on admin_mfa" ON public.admin_mfa;
CREATE POLICY "Service role full access on admin_mfa"
  ON public.admin_mfa
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5.3 mfa_recovery_codes RLS:
-- Recovery code hashes must NEVER be readable by anonymous or standard authenticated roles.
DROP POLICY IF EXISTS "Service role full access on mfa_recovery_codes" ON public.mfa_recovery_codes;
CREATE POLICY "Service role full access on mfa_recovery_codes"
  ON public.mfa_recovery_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- 6. ROLLBACK SCRIPT (IF REVERT IS EVER REQUIRED)
-- ==============================================================================
/*
-- To cleanly rollback Phase 6.1, execute the following SQL block in Supabase:

-- Drop tables in dependency-safe order
DROP TABLE IF EXISTS public.mfa_recovery_codes CASCADE;
DROP TABLE IF EXISTS public.admin_mfa CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;

-- Drop newly added constraints and indexes on users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_users_failed_login_attempts;
DROP INDEX IF EXISTS public.idx_users_locked_until;

-- Drop newly added columns on users
ALTER TABLE public.users DROP COLUMN IF EXISTS failed_login_attempts;
ALTER TABLE public.users DROP COLUMN IF EXISTS locked_until;
ALTER TABLE public.users DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE public.users DROP COLUMN IF EXISTS last_password_change_at;
*/
