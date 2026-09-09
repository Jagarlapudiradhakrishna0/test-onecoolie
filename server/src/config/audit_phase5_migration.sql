-- ==============================================================================
-- ONECOOLIE / RAILMITRA — SECURITY PHASE 5 DATABASE MIGRATION
-- High-Security Immutable Administrative Audit Logging System
-- ==============================================================================

-- 1. Create admin_audit_logs Table (Append-Only)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    actor_admin_role TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    result TEXT NOT NULL CHECK (result IN ('success', 'failure')),
    request_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for Forensics, High-Performance Filtering & Compliance Audits
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor_id ON public.admin_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_resource ON public.admin_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_request_id ON public.admin_audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_result ON public.admin_audit_logs(result);

-- 3. Database-Level Immutability Enforcement (Trigger)
-- Prevents UPDATE and DELETE operations even from direct SQL updates or admin queries.
CREATE OR REPLACE FUNCTION prevent_admin_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Policy Violation: admin_audit_logs records are strictly immutable. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_admin_audit_logs ON public.admin_audit_logs;
CREATE TRIGGER trg_immutable_admin_audit_logs
BEFORE UPDATE OR DELETE ON public.admin_audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_admin_audit_log_mutation();

-- 4. Row Level Security (RLS) Configuration
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow insert by service role and authenticated backend
DROP POLICY IF EXISTS "Allow backend insert on admin_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "Allow backend insert on admin_audit_logs" ON public.admin_audit_logs
    FOR INSERT WITH CHECK (true);

-- Allow admins to view audit records
DROP POLICY IF EXISTS "Admins can view admin_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view admin_audit_logs" ON public.admin_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );

-- Notice: NO UPDATE OR DELETE policies are created under RLS.
-- This ensures PostgreSQL rejects any UPDATE or DELETE requests at the RLS level.
