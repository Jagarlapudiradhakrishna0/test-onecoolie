-- ==============================================================================
-- ONECOOLIE / RAILMITRA — SECURITY PHASE 6.3 DATABASE MIGRATION
-- Refresh Token History Store for Rotation Reuse Detection
--
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/pzrttunhyfporcpcybax/sql
-- ==============================================================================

-- 1. Create refresh_token_history Table
-- Stores SHA-256 hashes of previously rotated refresh tokens.
-- Enables O(1) detection of token replay/theft and instant revocation of the token family.
CREATE TABLE IF NOT EXISTS public.refresh_token_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.user_sessions(id) ON DELETE CASCADE,
    family_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 2. Indexes for Fast Token Lookup and Historical Reuse Detection
CREATE INDEX IF NOT EXISTS idx_refresh_token_history_hash
  ON public.refresh_token_history(token_hash);

CREATE INDEX IF NOT EXISTS idx_refresh_token_history_family
  ON public.refresh_token_history(family_id);

CREATE INDEX IF NOT EXISTS idx_refresh_token_history_user
  ON public.refresh_token_history(user_id);

-- 3. Row Level Security: Restrict strictly to backend service_role
ALTER TABLE public.refresh_token_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on refresh_token_history" ON public.refresh_token_history;
CREATE POLICY "Service role full access on refresh_token_history"
  ON public.refresh_token_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- ROLLBACK SCRIPT (IF REVERT IS EVER REQUIRED)
-- ==============================================================================
/*
DROP TABLE IF EXISTS public.refresh_token_history CASCADE;
*/
