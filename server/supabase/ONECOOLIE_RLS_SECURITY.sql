-- ==============================================================================
-- ONECOOLIE — CONSOLIDATED RLS SECURITY HARDENING SCRIPT (V2 - RECURSION-FREE)
-- File: server/supabase/ONECOOLIE_RLS_SECURITY.sql
--
-- ARCHITECTURAL DECISIONS & GUARANTEES:
-- 1. PURGES CONFIRMED CRITICAL POLICIES (public unrestricted access).
-- 2. PURGES CONFIRMED DUPLICATES (legacy migration remnants).
-- 3. ELIMINATES RLS RECURSION:
--    - Zero subqueries to public.users within public.users RLS expressions.
--    - Helper function is_current_user_admin() is strictly SECURITY DEFINER.
-- 4. ADOPTS OPTION A (Backend-Mediated Profile Updates):
--    - Direct client UPDATE/DELETE on public.users is strictly DENIED.
--    - All profile/approval/role mutations run via Express backend using service_role.
--    - Impossible for users to self-promote to 'admin' or self-approve.
-- 5. ADOPTS BACKEND-MEDIATED ADMIN OPERATIONS:
--    - All administrative actions (cancellations, refunds, payouts, ticket management)
--      are routed through Express backend with JWT + MFA verification.
--    - Removes unnecessary direct authenticated Supabase admin 'FOR ALL' policies.
-- 6. PRESERVES STRICT IDENTITY OWNERSHIP:
--    - Passengers and assistants can only read/insert their own records.
--
-- STATUS: READ-ONLY REVIEW FILE. DO NOT EXECUTE AUTOMATICALLY.
-- REVIEW CAREFULLY BEFORE RUNNING IN SUPABASE SQL EDITOR.
-- ==============================================================================

-- ==============================================================================
-- SECTION 1 — REMOVE CONFIRMED CRITICAL & INSECURE POLICIES
-- ==============================================================================

-- 1.1 CRITICAL: Public full access on bookings (SEV-0)
DROP POLICY IF EXISTS "Allow all operations on bookings" ON public.bookings;

-- 1.2 CRITICAL: Public full access on users (SEV-0)
DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;

-- 1.3 CRITICAL: Public full access on cancellation_logs (omitted TO clause in legacy script)
DROP POLICY IF EXISTS "Allow all operations for service role on cancellation_logs" ON public.cancellation_logs;


-- ==============================================================================
-- SECTION 2 — PURGE DUPLICATE & OBSOLETE LEGACY MIGRATION POLICIES
-- ==============================================================================

-- bookings duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on bookings" ON public.bookings;

-- users duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on users" ON public.users;

-- support_tickets duplicates
DROP POLICY IF EXISTS "Service role manages support tickets" ON public.support_tickets;

-- payments duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on payments" ON public.payments;

-- refunds duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on refunds" ON public.refunds;

-- assistant_earnings duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on assistant_earnings" ON public.assistant_earnings;

-- assistant_payouts duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on assistant_payouts" ON public.assistant_payouts;
DROP POLICY IF EXISTS "Admins can view all payouts" ON public.assistant_payouts;
DROP POLICY IF EXISTS "Admins can view and manage all payouts" ON public.assistant_payouts;

-- assistant_payout_items duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on assistant_payout_items" ON public.assistant_payout_items;
DROP POLICY IF EXISTS "Admins can view all payout items" ON public.assistant_payout_items;

-- financial_audit_logs duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on financial_audit_logs" ON public.financial_audit_logs;
DROP POLICY IF EXISTS "Admins can view all financial audit logs" ON public.financial_audit_logs;

-- financial_incidents duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on financial_incidents" ON public.financial_incidents;
DROP POLICY IF EXISTS "Service role has full access to financial incidents" ON public.financial_incidents;

-- payment_webhook_events duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on payment_webhook_events" ON public.payment_webhook_events;

-- password_resets duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on password_resets" ON public.password_resets;

-- production validation duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on validation_sessions" ON public.production_validation_sessions;
DROP POLICY IF EXISTS "Service role access to validation sessions" ON public.production_validation_sessions;
DROP POLICY IF EXISTS "Service role can view validation evidence" ON public.production_validation_evidence;
DROP POLICY IF EXISTS "Service role can insert validation evidence" ON public.production_validation_evidence;
DROP POLICY IF EXISTS "Service role can view launch certifications" ON public.production_launch_certifications;
DROP POLICY IF EXISTS "Service role can insert launch certifications" ON public.production_launch_certifications;


-- ==============================================================================
-- SECTION 3 — PURGE UNNECESSARY & RECURSION-PRONE CLIENT ADMIN POLICIES
-- ==============================================================================
-- In OneCoolie, all admin operations are executed through the Node.js Express API
-- using the service_role key with multi-factor authentication (MFA). Direct client
-- access to Supabase by admins is unnecessary, creates policy recursion, and exposes attack surface.

DROP POLICY IF EXISTS "Admins have full access to bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins have full access to users" ON public.users;
DROP POLICY IF EXISTS "Admins have full access to support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins have full access to assistant_payouts" ON public.assistant_payouts;
DROP POLICY IF EXISTS "Admins can view financial audit logs" ON public.financial_audit_logs;


-- ==============================================================================
-- SECTION 4 — RECURSION-SAFE ADMIN HELPER FUNCTION (SECURITY DEFINER)
-- ==============================================================================
-- Provides a tamper-proof, non-recursive check if administrative privileges
-- are ever needed within PostgreSQL. By using SECURITY DEFINER and a fixed search_path,
-- this function queries public.users without triggering RLS evaluation loops.

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    _is_admin boolean;
BEGIN
    -- Return false immediately if unauthenticated
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    -- Query directly bypassing RLS because function is SECURITY DEFINER
    SELECT (role = 'admin') INTO _is_admin
    FROM public.users
    WHERE id = auth.uid();

    RETURN COALESCE(_is_admin, false);
END;
$$;

-- Restrict execution permissions
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated, service_role;


-- ==============================================================================
-- SECTION 5 — USER SELF-UPDATE SAFEGUARD (OPTION A: BACKEND-MEDIATED)
-- ==============================================================================
-- Drop direct client UPDATE policy on public.users.
-- Profile edits (phone updates, profile info) and admin updates (approvals, role changes)
-- MUST be executed via the Express backend API (/api/auth/update-phone, /api/admin/users/:id).
-- By omitting an UPDATE policy for 'authenticated', PostgreSQL defaults to DENY ALL.
-- This permanently prevents:
--   1. RLS infinite recursion
--   2. Self-promotion to role = 'admin'
--   3. Self-approval of KYC/assistant status (is_approved = true)
--   4. BOLA / cross-user profile tampering

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;


-- ==============================================================================
-- SECTION 6 — CONFIRM SAFE CLIENT OWNERSHIP POLICIES (NON-RECURSIVE)
-- ==============================================================================
-- All expressions below compare table columns directly to auth.uid().
-- No subqueries. Zero RLS recursion. Strict ownership enforcement.

-- 6.1 Users table: Authenticated users can only read their own profile row
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- 6.2 Bookings: Read restricted to owning passenger or assigned assistant
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT TO authenticated
    USING (auth.uid() = passenger_id OR auth.uid() = assistant_id);

-- 6.3 Bookings: Passengers can only insert bookings for themselves
DROP POLICY IF EXISTS "Passengers can create bookings" ON public.bookings;
CREATE POLICY "Passengers can create bookings" ON public.bookings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = passenger_id);

-- 6.4 Support Tickets: Read restricted to passenger, creator, or assigned assistant
DROP POLICY IF EXISTS "Users can view own support tickets" ON public.support_tickets;
CREATE POLICY "Users can view own support tickets" ON public.support_tickets
    FOR SELECT TO authenticated
    USING (
        auth.uid() = passenger_id OR
        auth.uid() = created_by OR
        auth.uid() = assistant_id
    );

-- 6.5 Support Tickets: Creation restricted to authenticated creator/passenger
DROP POLICY IF EXISTS "Users can create own support tickets" ON public.support_tickets;
CREATE POLICY "Users can create own support tickets" ON public.support_tickets
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = created_by OR
        auth.uid() = passenger_id
    );

-- 6.6 Notifications: Read restricted to owner
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 6.7 Notifications: Mark read restricted to owner
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6.8 Payments: Passengers can only view their own payment receipts
DROP POLICY IF EXISTS "Passengers can view own payments" ON public.payments;
CREATE POLICY "Passengers can view own payments" ON public.payments
    FOR SELECT TO authenticated
    USING (auth.uid() = passenger_id);

-- 6.9 Refunds: Passengers can only view their own refund receipts
DROP POLICY IF EXISTS "Passengers can view own refunds" ON public.refunds;
CREATE POLICY "Passengers can view own refunds" ON public.refunds
    FOR SELECT TO authenticated
    USING (auth.uid() = passenger_id);

-- 6.10 Assistant Earnings: Assistants can only view their own earnings
DROP POLICY IF EXISTS "Assistants can view own earnings" ON public.assistant_earnings;
CREATE POLICY "Assistants can view own earnings" ON public.assistant_earnings
    FOR SELECT TO authenticated
    USING (auth.uid() = assistant_id);

-- 6.11 Assistant Payouts: Assistants can only view their own payouts
DROP POLICY IF EXISTS "Assistants can view own payouts" ON public.assistant_payouts;
CREATE POLICY "Assistants can view own payouts" ON public.assistant_payouts
    FOR SELECT TO authenticated
    USING (auth.uid() = assistant_id);

-- 6.12 Assistant Payout Items: Assistants can only view items belonging to their payouts
DROP POLICY IF EXISTS "Assistants can view own payout items" ON public.assistant_payout_items;
CREATE POLICY "Assistants can view own payout items" ON public.assistant_payout_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.assistant_payouts ap 
            WHERE ap.id = assistant_payout_items.payout_id 
              AND ap.assistant_id = auth.uid()
        )
    );


-- ==============================================================================
-- SECTION 7 — CANONICAL SERVICE ROLE POLICIES (BACKEND ACCESS SAFEGUARDS)
-- ==============================================================================
-- In Supabase, the service_role possesses the BYPASSRLS attribute by default.
-- Retaining canonical explicit service_role policies ensures backward compatibility
-- and guarantees backend operational reliability across all configurations.

DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on user_sessions" ON public.user_sessions;
CREATE POLICY "Service role full access on user_sessions" ON public.user_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on admin_mfa" ON public.admin_mfa;
CREATE POLICY "Service role full access on admin_mfa" ON public.admin_mfa FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on mfa_recovery_codes" ON public.mfa_recovery_codes;
CREATE POLICY "Service role full access on mfa_recovery_codes" ON public.mfa_recovery_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on refresh_token_history" ON public.refresh_token_history;
CREATE POLICY "Service role full access on refresh_token_history" ON public.refresh_token_history FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on bookings" ON public.bookings;
CREATE POLICY "Service role full access on bookings" ON public.bookings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on cancellation_logs" ON public.cancellation_logs;
CREATE POLICY "Service role full access on cancellation_logs" ON public.cancellation_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on email_otps" ON public.email_otps;
CREATE POLICY "Service role full access on email_otps" ON public.email_otps FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on password_resets" ON public.password_resets;
CREATE POLICY "Service role full access on password_resets" ON public.password_resets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on payments" ON public.payments;
CREATE POLICY "Service role full access on payments" ON public.payments FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on refunds" ON public.refunds;
CREATE POLICY "Service role full access on refunds" ON public.refunds FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on assistant_earnings" ON public.assistant_earnings;
CREATE POLICY "Service role full access on assistant_earnings" ON public.assistant_earnings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on assistant_payouts" ON public.assistant_payouts;
CREATE POLICY "Service role full access on assistant_payouts" ON public.assistant_payouts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on assistant_payout_items" ON public.assistant_payout_items;
CREATE POLICY "Service role full access on assistant_payout_items" ON public.assistant_payout_items FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on financial_audit_logs" ON public.financial_audit_logs;
CREATE POLICY "Service role full access on financial_audit_logs" ON public.financial_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on financial_incidents" ON public.financial_incidents;
CREATE POLICY "Service role full access on financial_incidents" ON public.financial_incidents FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on payment_webhook_events" ON public.payment_webhook_events;
CREATE POLICY "Service role full access on payment_webhook_events" ON public.payment_webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on admin_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "Service role full access on admin_audit_logs" ON public.admin_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on security_events" ON public.security_events;
CREATE POLICY "Service role full access on security_events" ON public.security_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on security_incidents" ON public.security_incidents;
CREATE POLICY "Service role full access on security_incidents" ON public.security_incidents FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on security_incident_events" ON public.security_incident_events;
CREATE POLICY "Service role full access on security_incident_events" ON public.security_incident_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on security_response_actions" ON public.security_response_actions;
CREATE POLICY "Service role full access on security_response_actions" ON public.security_response_actions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on activity_logs" ON public.activity_logs;
CREATE POLICY "Service role full access on activity_logs" ON public.activity_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on sos_alerts" ON public.sos_alerts;
CREATE POLICY "Service role full access on sos_alerts" ON public.sos_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on support_tickets" ON public.support_tickets;
CREATE POLICY "Service role full access on support_tickets" ON public.support_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on notifications" ON public.notifications;
CREATE POLICY "Service role full access on notifications" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ==============================================================================
-- SECTION 8 — CONFIRM ROW LEVEL SECURITY IS ACTIVE ACROSS ALL 32 TABLES
-- ==============================================================================

DO $$
DECLARE
    tbl text;
    tables_list text[] := ARRAY[
        'users', 'user_sessions', 'admin_mfa', 'mfa_recovery_codes', 'refresh_token_history',
        'bookings', 'cancellation_logs', 'email_otps', 'password_resets', 'payments',
        'refunds', 'assistant_earnings', 'assistant_payouts', 'assistant_payout_items',
        'financial_audit_logs', 'financial_incidents', 'payment_webhook_events',
        'admin_audit_logs', 'security_events', 'security_incidents',
        'security_incident_events', 'security_response_actions', 'activity_logs',
        'sos_alerts', 'support_tickets', 'notifications', 'deployment_verifications',
        'recovery_verifications', 'application_operational_events',
        'production_validation_sessions', 'production_validation_evidence',
        'production_launch_certifications'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_list LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    END LOOP;
END $$;

-- Verification Query
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
