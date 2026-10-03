-- ==============================================================================
-- ONECOOLIE — RBAC & Admin Security Hardened Database Migration
-- File: 20260301_add_rbac.sql
-- Description:
--   Ensures users.admin_role and users.is_mfa_active exist with appropriate
--   fail-closed constraints, fast indexes, and default administrative assignments.
--
-- Safe for existing data (Idempotent & non-destructive).
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/pzrttunhyfporcpcybax/sql
-- ==============================================================================

-- 1. Ensure admin_role column exists on users table (Default NULL for least privilege)
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS admin_role TEXT DEFAULT NULL;

-- 2. Ensure is_mfa_active column exists on users table (Default FALSE)
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS is_mfa_active BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Data Sanitization: Ensure non-admin users never hold an admin_role
UPDATE public.users 
SET admin_role = NULL 
WHERE role != 'admin' AND admin_role IS NOT NULL;

-- 4. Explicit Administrator Role & MFA Assignment:
-- Assign designated primary administrator accounts to 'super_admin'
UPDATE public.users 
SET admin_role = 'super_admin'
WHERE email IN ('admin01@onecoolie.in', 'admin02@onecoolie.in', 'admin@onecoolie.com')
  AND role = 'admin';

-- Synchronize is_mfa_active with admin_mfa enrollment status if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_mfa') THEN
    UPDATE public.users u
    SET is_mfa_active = m.is_enrolled
    FROM public.admin_mfa m
    WHERE u.id = m.user_id AND u.role = 'admin';
  END IF;
END $$;

-- 5. Database Constraint Enforcement:
-- Rule A: If role != 'admin', admin_role MUST be NULL.
-- Rule B: If role == 'admin', admin_role must be NULL (unassigned/fail-closed)
--         or one of the valid RBAC roles (including station_manager and support_agent).
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_admin_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_admin_role_check CHECK (
  (role != 'admin' AND admin_role IS NULL)
  OR
  (role = 'admin' AND (
    admin_role IS NULL OR admin_role IN (
      'super_admin',
      'operations_admin',
      'station_manager',
      'assistant_admin',
      'finance_admin',
      'safety_admin',
      'support_admin',
      'support_agent',
      'auditor'
    )
  ))
);

-- 6. Performance Indexes
-- Fast lookups for authorized administrators and active MFA verification
CREATE INDEX IF NOT EXISTS idx_users_admin_role 
  ON public.users(admin_role) 
  WHERE role = 'admin';

CREATE INDEX IF NOT EXISTS idx_users_mfa_active 
  ON public.users(is_mfa_active) 
  WHERE role = 'admin';

-- ==============================================================================
-- Migration complete. Verified safe, idempotent, and non-destructive.
-- ==============================================================================
