-- ============================================================
-- ONECOOLIE — RBAC Phase 2C Security Hardened Database Migration
-- Fail-Closed Authorization & Least-Privilege Architecture
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/pzrttunhyfporcpcybax/sql
-- ============================================================

-- 1. Ensure admin_role column exists on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_role TEXT DEFAULT NULL;

-- 2. Data Sanitization: Ensure non-admin users never hold an admin_role
UPDATE users 
SET admin_role = NULL 
WHERE role != 'admin' AND admin_role IS NOT NULL;

-- 3. Explicit Administrator Migration:
-- Explicitly assign the designated primary administrator account to 'super_admin'.
-- Any other admin accounts without an explicit assignment remain NULL (fail-closed, 0 privileges)
-- until explicitly granted a role by a super_admin.
UPDATE users 
SET admin_role = 'super_admin'
WHERE email = 'admin@onecoolie.com' AND role = 'admin';

-- 4. Database Constraint Enforcement:
-- Rule A: If role != 'admin', admin_role MUST be NULL.
-- Rule B: If role == 'admin', admin_role must be NULL (unassigned) or one of the 7 valid RBAC roles.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_admin_role_check;
ALTER TABLE users ADD CONSTRAINT users_admin_role_check CHECK (
  (role != 'admin' AND admin_role IS NULL)
  OR
  (role = 'admin' AND (
    admin_role IS NULL OR admin_role IN (
      'super_admin',
      'operations_admin',
      'assistant_admin',
      'finance_admin',
      'safety_admin',
      'support_admin',
      'auditor'
    )
  ))
);

-- 5. Fast Index for Authorized Admin Lookups
CREATE INDEX IF NOT EXISTS idx_users_admin_role ON users(admin_role) WHERE role = 'admin';

-- ============================================================
-- ROLLBACK SCRIPT (IF EVER NEEDED)
-- ============================================================
-- DROP INDEX IF EXISTS idx_users_admin_role;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_admin_role_check;
-- ALTER TABLE users DROP COLUMN IF EXISTS admin_role;
