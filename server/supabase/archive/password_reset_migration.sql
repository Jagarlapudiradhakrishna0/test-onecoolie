-- ============================================================
-- ONECOOLIE — Password Reset Table Migration
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/pzrttunhyfporcpcybax/sql
-- ============================================================

-- Create password_resets table
-- Separate from email_otps to avoid touching existing login/signup flow
CREATE TABLE IF NOT EXISTS password_resets (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                   TEXT NOT NULL,

  -- Phase 1: OTP fields
  otp_hash                TEXT NOT NULL,            -- bcrypt hash of the 6-digit OTP
  otp_expires_at          TIMESTAMPTZ NOT NULL,     -- 10-minute OTP validity window
  otp_used                BOOLEAN DEFAULT FALSE,    -- Marked true once OTP verified
  otp_attempts            INTEGER DEFAULT 0,        -- Failed attempt counter (brute-force guard)

  -- Phase 2: Reset token fields (populated after OTP verification)
  reset_token_hash        TEXT,                     -- SHA-256 hash of the short-lived reset JWT
  reset_token_expires_at  TIMESTAMPTZ,             -- 15-minute token validity window
  reset_token_used        BOOLEAN DEFAULT FALSE,   -- Marked true after password is reset

  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_password_resets_email    ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires  ON password_resets(otp_expires_at);

-- Enable Row Level Security
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Allow server (service-role) full access — same pattern as email_otps table
CREATE POLICY "Allow all operations for service role on password_resets"
  ON password_resets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: clean up expired / used records periodically
-- DELETE FROM password_resets
-- WHERE (otp_expires_at < now() AND otp_used = false)
--    OR (reset_token_used = true)
--    OR (reset_token_expires_at < now() AND reset_token_used = false);
