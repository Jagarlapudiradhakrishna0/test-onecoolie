-- ==============================================================================
-- ONECOOLIE PHASE 6.7: SECURITY MONITORING & INCIDENT RESPONSE SCHEMA MIGRATION
-- ==============================================================================
-- Creates authoritative tables for:
-- 1. security_events: normalized security telemetry & audit events
-- 2. security_incidents: correlated security incidents with lifecycle management
-- 3. security_incident_events: join table linking incidents to triggered events
-- 4. security_response_actions: automated and administrative containment audit trail
--
-- Enables RLS on all tables with exclusive backend service role access.
-- ==============================================================================

-- 1. SECURITY EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.user_sessions(id) ON DELETE SET NULL,
    family_id UUID,
    request_id TEXT,
    source_ip TEXT,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast event querying and sliding window pattern detection
CREATE INDEX IF NOT EXISTS idx_security_events_user ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_session ON public.security_events(session_id);
CREATE INDEX IF NOT EXISTS idx_security_events_family ON public.security_events(family_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_request ON public.security_events(request_id);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_created ON public.security_events(source_ip, created_at DESC);

-- 2. SECURITY INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS public.security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'dismissed')),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.user_sessions(id) ON DELETE SET NULL,
    family_id UUID,
    source_ip TEXT,
    event_count INTEGER NOT NULL DEFAULT 1,
    containment_action TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON public.security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON public.security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_user ON public.security_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_family ON public.security_incidents(family_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_created ON public.security_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_incidents_type_status ON public.security_incidents(incident_type, status);

-- 3. SECURITY INCIDENT EVENTS JOIN TABLE
CREATE TABLE IF NOT EXISTS public.security_incident_events (
    incident_id UUID REFERENCES public.security_incidents(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.security_events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (incident_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_security_inc_events_evt ON public.security_incident_events(event_id);

-- 4. SECURITY RESPONSE ACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.security_response_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES public.security_incidents(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    initiated_by TEXT NOT NULL CHECK (initiated_by IN ('system', 'admin')),
    initiated_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    result TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_resp_incident ON public.security_response_actions(incident_id);
CREATE INDEX IF NOT EXISTS idx_security_resp_created ON public.security_response_actions(created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Default deny all client access for anon and authenticated Supabase client roles.
-- All operations are performed strictly by backend services using the Service Role Key.

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_response_actions ENABLE ROW LEVEL SECURITY;

-- Drop any existing public policies to ensure clean state
DROP POLICY IF EXISTS "Deny all client access on security_events" ON public.security_events;
DROP POLICY IF EXISTS "Deny all client access on security_incidents" ON public.security_incidents;
DROP POLICY IF EXISTS "Deny all client access on security_incident_events" ON public.security_incident_events;
DROP POLICY IF EXISTS "Deny all client access on security_response_actions" ON public.security_response_actions;

-- Create explicit service-role-only policies
CREATE POLICY "Deny all client access on security_events"
    ON public.security_events
    FOR ALL
    TO anon, authenticated
    USING (false);

CREATE POLICY "Deny all client access on security_incidents"
    ON public.security_incidents
    FOR ALL
    TO anon, authenticated
    USING (false);

CREATE POLICY "Deny all client access on security_incident_events"
    ON public.security_incident_events
    FOR ALL
    TO anon, authenticated
    USING (false);

CREATE POLICY "Deny all client access on security_response_actions"
    ON public.security_response_actions
    FOR ALL
    TO anon, authenticated
    USING (false);
