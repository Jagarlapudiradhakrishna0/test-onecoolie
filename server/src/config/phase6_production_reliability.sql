-- ==============================================================================
-- ONECOOLIE Phase 6.8: Production Reliability, Backup & Disaster Recovery Migration
-- ==============================================================================
-- Creates operational tables for:
-- 1. public.deployment_verifications
-- 2. public.recovery_verifications
-- 3. public.application_operational_events
--
-- Strict Security: Zero storage of credentials, tokens, or raw backup URLs.
-- Row Level Security (RLS) is enabled with default-deny policies for client roles.
-- ==============================================================================

-- 1. Deployment Verifications
CREATE TABLE IF NOT EXISTS public.deployment_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment VARCHAR(50) NOT NULL DEFAULT 'production',
    verification_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('passed', 'failed', 'warning')),
    summary TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployment_verifications_status ON public.deployment_verifications (status);
CREATE INDEX IF NOT EXISTS idx_deployment_verifications_env ON public.deployment_verifications (environment);
CREATE INDEX IF NOT EXISTS idx_deployment_verifications_created_at ON public.deployment_verifications (created_at DESC);

-- 2. Recovery Verifications (Disaster Recovery & Backup Readiness)
CREATE TABLE IF NOT EXISTS public.recovery_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('verified', 'failed', 'pending', 'warning')),
    backup_reference VARCHAR(255),
    rpo_target VARCHAR(50) NOT NULL DEFAULT '24h',
    rto_target VARCHAR(50) NOT NULL DEFAULT '4h',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_verifications_status ON public.recovery_verifications (status);
CREATE INDEX IF NOT EXISTS idx_recovery_verifications_verified_at ON public.recovery_verifications (verified_at DESC);

-- 3. Application Operational Events
CREATE TABLE IF NOT EXISTS public.application_operational_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    request_id VARCHAR(100),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_operational_events_type ON public.application_operational_events (event_type);
CREATE INDEX IF NOT EXISTS idx_app_operational_events_severity ON public.application_operational_events (severity);
CREATE INDEX IF NOT EXISTS idx_app_operational_events_created_at ON public.application_operational_events (created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Default deny all client access for anon and authenticated Supabase client roles.
-- Operations tables are managed strictly by backend service-role infrastructure.

ALTER TABLE public.deployment_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_operational_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all client access on deployment_verifications" ON public.deployment_verifications;
DROP POLICY IF EXISTS "Deny all client access on recovery_verifications" ON public.recovery_verifications;
DROP POLICY IF EXISTS "Deny all client access on application_operational_events" ON public.application_operational_events;

CREATE POLICY "Deny all client access on deployment_verifications"
    ON public.deployment_verifications
    FOR ALL
    TO anon, authenticated
    USING (false);

CREATE POLICY "Deny all client access on recovery_verifications"
    ON public.recovery_verifications
    FOR ALL
    TO anon, authenticated
    USING (false);

CREATE POLICY "Deny all client access on application_operational_events"
    ON public.application_operational_events
    FOR ALL
    TO anon, authenticated
    USING (false);
