-- ==============================================================================
-- ONECOOLIE — AUTHORITATIVE RLS SECURITY HARDENING SCRIPT (DETERMINISTIC)
-- File: server/supabase/ONECOOLIE_RLS_FINAL.sql
-- Version: 6.0.0 (Production Verified)
--
-- STRICT ARCHITECTURAL PRINCIPLES:
-- 1. NO DYNAMIC POLICY DELETION. ZERO pattern loops, wildcards, or dynamic SQL.
--    Every policy drop is an explicit DROP POLICY IF EXISTS on an exact table.
-- 2. NO TABLE DROPS, NO DATABASE DROPS, NO DATA DELETIONS, NO RLS DISABLING.
-- 3. ZERO PUBLIC/ANON ACCESS to private application tables.
-- 4. ZERO DIRECT CLIENT UPDATE OR DELETE on public.users (Prevents self-elevation & RLS recursion).
-- 5. ZERO DIRECT CLIENT ADMIN POLICIES (All admin ops run via Express backend using service_role).
-- 6. STRICT PASSENGER & ASSISTANT OWNERSHIP ISOLATION (BOLA/IDOR protection).
-- 7. 21 SENSITIVE BACKEND-ONLY TABLES RESTRICTED STRICTLY TO service_role.
-- 8. EVERY service_role policy explicitly uses 'TO service_role' (No accidental public).
-- 9. ADMIN HELPER FUNCTION REMOVED (Zero runtime dependencies; admin logic is Express-only).
--
-- STATUS: READ-ONLY REVIEW FILE. DO NOT EXECUTE AUTOMATICALLY.
-- REVIEW CAREFULLY BEFORE RUNNING IN SUPABASE SQL EDITOR.
-- ==============================================================================

-- ==============================================================================
-- SECTION 1 — REMOVE UNNECESSARY DATABASE ADMIN HELPER FUNCTION
-- ==============================================================================
-- In OneCoolie, all administrative authorization is performed by the Express
-- backend using JWT verification and TOTP MFA. No RLS policy references this function.

DROP FUNCTION IF EXISTS public.is_current_user_admin();


-- ==============================================================================
-- SECTION 2 — EXPLICIT REMOVAL OF UNRESTRICTED PUBLIC & INSECURE POLICIES
-- ==============================================================================
-- These policies were discovered in pg_policies with roles = public or anon,
-- exposing tables to unauthenticated external access via the Supabase REST API.

-- 2.1 activity_logs (Public read/write/delete on user activity logs)
DROP POLICY IF EXISTS "Allow all operations on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow all operations for service role on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.activity_logs;

-- 2.2 email_otps (Public exposure of OTP hashes & verification states)
DROP POLICY IF EXISTS "Allow all operations for service role on email_otps" ON public.email_otps;
DROP POLICY IF EXISTS "Allow all operations on email_otps" ON public.email_otps;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.email_otps;

-- 2.3 sos_alerts (Public access to emergency SOS events)
DROP POLICY IF EXISTS "Allow all operations on sos_alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Allow all operations for service role on sos_alerts" ON public.sos_alerts;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.sos_alerts;

-- 2.4 admin_audit_logs (Public forged log injection & public log reads)
DROP POLICY IF EXISTS "Allow backend insert on admin_audit_logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Allow backend insert" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admins can view admin_audit_logs" ON public.admin_audit_logs;

-- 2.5 bookings (Public unauthenticated read/write on passenger travel records)
DROP POLICY IF EXISTS "Allow all operations on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow all operations for service role on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.bookings;

-- 2.6 users (Public unauthenticated read/write on credentials & user directory)
DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;
DROP POLICY IF EXISTS "Allow all operations for service role on users" ON public.users;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.users;

-- 2.7 cancellation_logs (Public read/write on cancellation audit records)
DROP POLICY IF EXISTS "Allow all operations for service role on cancellation_logs" ON public.cancellation_logs;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.cancellation_logs;


-- ==============================================================================
-- SECTION 3 — EXPLICIT REMOVAL OF DUPLICATE & OBSOLETE MIGRATION POLICIES
-- ==============================================================================

-- support_tickets duplicates
DROP POLICY IF EXISTS "Service role manages support tickets" ON public.support_tickets;

-- payments duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.payments;

-- refunds duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on refunds" ON public.refunds;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.refunds;

-- assistant_earnings duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on assistant_earnings" ON public.assistant_earnings;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.assistant_earnings;

-- assistant_payouts duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on assistant_payouts" ON public.assistant_payouts;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.assistant_payouts;
DROP POLICY IF EXISTS "Admins can view all payouts" ON public.assistant_payouts;
DROP POLICY IF EXISTS "Admins can view and manage all payouts" ON public.assistant_payouts;

-- assistant_payout_items duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on assistant_payout_items" ON public.assistant_payout_items;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.assistant_payout_items;
DROP POLICY IF EXISTS "Admins can view all payout items" ON public.assistant_payout_items;
DROP POLICY IF EXISTS "Admins can view and manage all payout items" ON public.assistant_payout_items;

-- financial_audit_logs duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on financial_audit_logs" ON public.financial_audit_logs;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.financial_audit_logs;
DROP POLICY IF EXISTS "Admins can view all financial audit logs" ON public.financial_audit_logs;

-- financial_incidents duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on financial_incidents" ON public.financial_incidents;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.financial_incidents;
DROP POLICY IF EXISTS "Service role has full access to financial incidents" ON public.financial_incidents;

-- payment_webhook_events duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on payment_webhook_events" ON public.payment_webhook_events;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.payment_webhook_events;

-- password_resets duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on password_resets" ON public.password_resets;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.password_resets;

-- production_validation_sessions duplicates
DROP POLICY IF EXISTS "Allow all operations for service role on validation_sessions" ON public.production_validation_sessions;
DROP POLICY IF EXISTS "Allow all operations for service role" ON public.production_validation_sessions;
DROP POLICY IF EXISTS "Service role access to validation sessions" ON public.production_validation_sessions;

-- production_validation_evidence duplicates
DROP POLICY IF EXISTS "Service role can view validation evidence" ON public.production_validation_evidence;
DROP POLICY IF EXISTS "Service role can insert validation evidence" ON public.production_validation_evidence;

-- production_launch_certifications duplicates
DROP POLICY IF EXISTS "Service role can view launch certifications" ON public.production_launch_certifications;
DROP POLICY IF EXISTS "Service role can insert launch certifications" ON public.production_launch_certifications;


-- ==============================================================================
-- SECTION 4 — EXPLICIT REMOVAL OF DIRECT CLIENT ADMIN & RECURSIVE POLICIES
-- ==============================================================================
-- Direct client admin policies create attack surfaces and cause RLS recursion.
-- Administrative workflows execute strictly server-side via Express using service_role.

DROP POLICY IF EXISTS "Admins have full access to bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins have full access to users" ON public.users;
DROP POLICY IF EXISTS "Admins have full access to support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins have full access to assistant_payouts" ON public.assistant_payouts;
DROP POLICY IF EXISTS "Admins have full access to assistant_payout_items" ON public.assistant_payout_items;
DROP POLICY IF EXISTS "Admins have full access to financial incidents" ON public.financial_incidents;
DROP POLICY IF EXISTS "Admins have full access to validation sessions" ON public.production_validation_sessions;
DROP POLICY IF EXISTS "Admins can view financial audit logs" ON public.financial_audit_logs;
DROP POLICY IF EXISTS "Admins can view validation evidence" ON public.production_validation_evidence;
DROP POLICY IF EXISTS "Admins can insert validation evidence" ON public.production_validation_evidence;
DROP POLICY IF EXISTS "Admins can view launch certifications" ON public.production_launch_certifications;
DROP POLICY IF EXISTS "Admins can insert launch certifications" ON public.production_launch_certifications;

-- Drop user self-update policy (strictly denies client UPDATE on public.users)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Drop legacy short-named service role policies
DROP POLICY IF EXISTS "Service role full access" ON public.users;
DROP POLICY IF EXISTS "Service role full access" ON public.bookings;
DROP POLICY IF EXISTS "Service role full access" ON public.payments;
DROP POLICY IF EXISTS "Service role full access" ON public.refunds;
DROP POLICY IF EXISTS "Service role full access" ON public.assistant_earnings;
DROP POLICY IF EXISTS "Service role full access" ON public.assistant_payouts;
DROP POLICY IF EXISTS "Service role full access" ON public.assistant_payout_items;
DROP POLICY IF EXISTS "Service role full access" ON public.cancellation_logs;
DROP POLICY IF EXISTS "Service role full access" ON public.support_tickets;
DROP POLICY IF EXISTS "Service role full access" ON public.notifications;
DROP POLICY IF EXISTS "Service role full access" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role full access" ON public.admin_mfa;
DROP POLICY IF EXISTS "Service role full access" ON public.mfa_recovery_codes;
DROP POLICY IF EXISTS "Service role full access" ON public.refresh_token_history;
DROP POLICY IF EXISTS "Service role full access" ON public.email_otps;
DROP POLICY IF EXISTS "Service role full access" ON public.password_resets;
DROP POLICY IF EXISTS "Service role full access" ON public.financial_audit_logs;
DROP POLICY IF EXISTS "Service role full access" ON public.financial_incidents;
DROP POLICY IF EXISTS "Service role full access" ON public.payment_webhook_events;
DROP POLICY IF EXISTS "Service role full access" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Service role full access" ON public.activity_logs;
DROP POLICY IF EXISTS "Service role full access" ON public.sos_alerts;
DROP POLICY IF EXISTS "Service role full access" ON public.deployment_verifications;
DROP POLICY IF EXISTS "Service role full access" ON public.recovery_verifications;
DROP POLICY IF EXISTS "Service role full access" ON public.application_operational_events;
DROP POLICY IF EXISTS "Service role full access" ON public.security_events;
DROP POLICY IF EXISTS "Service role full access" ON public.security_incidents;
DROP POLICY IF EXISTS "Service role full access" ON public.security_incident_events;
DROP POLICY IF EXISTS "Service role full access" ON public.security_response_actions;
DROP POLICY IF EXISTS "Service role full access" ON public.production_validation_sessions;
DROP POLICY IF EXISTS "Service role full access" ON public.production_validation_evidence;
DROP POLICY IF EXISTS "Service role full access" ON public.production_launch_certifications;

-- Drop legacy Deny policies from monitoring migrations
DROP POLICY IF EXISTS "Deny all client access" ON public.security_events;
DROP POLICY IF EXISTS "Deny all client access" ON public.security_incidents;
DROP POLICY IF EXISTS "Deny all client access" ON public.security_incident_events;
DROP POLICY IF EXISTS "Deny all client access" ON public.security_response_actions;
DROP POLICY IF EXISTS "Deny all client access" ON public.deployment_verifications;
DROP POLICY IF EXISTS "Deny all client access" ON public.recovery_verifications;
DROP POLICY IF EXISTS "Deny all client access" ON public.application_operational_events;


-- ==============================================================================
-- SECTION 5 — USERS TABLE: BACKEND-MEDIATED PROFILE MUTATIONS (OPTION A)
-- ==============================================================================
-- 1. Authenticated users can ONLY SELECT their own profile row.
-- 2. Direct client UPDATE and DELETE are DENIED (no policy defined = PostgreSQL default DENY).
-- 3. Profile mutations (phone updates via /api/auth/update-phone) and admin actions
--    (approvals, role changes via /api/admin/users/:id) MUST execute via Express using service_role.
-- 4. Result: Zero RLS recursion, zero self-elevation to admin, zero self-approval.

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);


-- ==============================================================================
-- SECTION 6 — CANONICAL CLIENT OWNERSHIP POLICIES (NON-RECURSIVE)
-- ==============================================================================
-- All policies below strictly compare table columns against auth.uid().
-- Zero subqueries to public.users. Zero RLS recursion loops.

-- 6.1 Bookings: Passengers and assigned assistants can only view their own bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT TO authenticated
    USING (auth.uid() = passenger_id OR auth.uid() = assistant_id);

-- 6.2 Bookings: Passengers can only create bookings for themselves
DROP POLICY IF EXISTS "Passengers can create bookings" ON public.bookings;
CREATE POLICY "Passengers can create bookings" ON public.bookings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = passenger_id);

-- 6.3 Support Tickets: Participants can only view their own tickets
DROP POLICY IF EXISTS "Users can view own support tickets" ON public.support_tickets;
CREATE POLICY "Users can view own support tickets" ON public.support_tickets
    FOR SELECT TO authenticated
    USING (
        auth.uid() = passenger_id OR
        auth.uid() = created_by OR
        auth.uid() = assistant_id
    );

-- 6.4 Support Tickets: Users can only create tickets listing themselves
DROP POLICY IF EXISTS "Users can create own support tickets" ON public.support_tickets;
CREATE POLICY "Users can create own support tickets" ON public.support_tickets
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = created_by OR
        auth.uid() = passenger_id
    );

-- 6.5 Notifications: Users can only view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 6.6 Notifications: Users can only update their own notifications (e.g. mark read)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6.7 Payments: Passengers can only view their own payment records
DROP POLICY IF EXISTS "Passengers can view own payments" ON public.payments;
CREATE POLICY "Passengers can view own payments" ON public.payments
    FOR SELECT TO authenticated
    USING (auth.uid() = passenger_id);

-- 6.8 Refunds: Passengers can only view their own refund records
DROP POLICY IF EXISTS "Passengers can view own refunds" ON public.refunds;
CREATE POLICY "Passengers can view own refunds" ON public.refunds
    FOR SELECT TO authenticated
    USING (auth.uid() = passenger_id);

-- 6.9 Assistant Earnings: Assistants can only view their own earnings
DROP POLICY IF EXISTS "Assistants can view own earnings" ON public.assistant_earnings;
CREATE POLICY "Assistants can view own earnings" ON public.assistant_earnings
    FOR SELECT TO authenticated
    USING (auth.uid() = assistant_id);

-- 6.10 Assistant Payouts: Assistants can only view their own payouts
DROP POLICY IF EXISTS "Assistants can view own payouts" ON public.assistant_payouts;
CREATE POLICY "Assistants can view own payouts" ON public.assistant_payouts
    FOR SELECT TO authenticated
    USING (auth.uid() = assistant_id);

-- 6.11 Assistant Payout Items: Assistants can only view items belonging to their payouts
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

-- 6.12 SOS Alerts: Passengers can only view their own SOS emergency events
DROP POLICY IF EXISTS "Passengers can view own sos alerts" ON public.sos_alerts;
CREATE POLICY "Passengers can view own sos alerts" ON public.sos_alerts
    FOR SELECT TO authenticated
    USING (auth.uid() = passenger_id);

-- 6.13 SOS Alerts: Passengers can only insert their own SOS alerts
DROP POLICY IF EXISTS "Passengers can trigger own sos alerts" ON public.sos_alerts;
CREATE POLICY "Passengers can trigger own sos alerts" ON public.sos_alerts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = passenger_id);


-- ==============================================================================
-- SECTION 7 — CANONICAL SERVICE ROLE POLICIES (EXPLICIT BACKEND ACCESS)
-- ==============================================================================
-- Every service_role policy explicitly specifies 'TO service_role'.
-- Combined with PostgreSQL BYPASSRLS, this guarantees reliable Express API access.

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

DROP POLICY IF EXISTS "Service role full access on deployment_verifications" ON public.deployment_verifications;
CREATE POLICY "Service role full access on deployment_verifications" ON public.deployment_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on recovery_verifications" ON public.recovery_verifications;
CREATE POLICY "Service role full access on recovery_verifications" ON public.recovery_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on application_operational_events" ON public.application_operational_events;
CREATE POLICY "Service role full access on application_operational_events" ON public.application_operational_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on production_validation_sessions" ON public.production_validation_sessions;
CREATE POLICY "Service role full access on production_validation_sessions" ON public.production_validation_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on production_validation_evidence" ON public.production_validation_evidence;
CREATE POLICY "Service role full access on production_validation_evidence" ON public.production_validation_evidence FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on production_launch_certifications" ON public.production_launch_certifications;
CREATE POLICY "Service role full access on production_launch_certifications" ON public.production_launch_certifications FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ==============================================================================
-- SECTION 8 — CONFIRM ROW LEVEL SECURITY IS ACTIVE ON ALL 32 TABLES
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_mfa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_token_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_payout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_response_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_operational_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_validation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_validation_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_launch_certifications ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- SECTION 9 — STRICT READ-ONLY VERIFICATION QUERIES
-- ==============================================================================

-- A. Any public or anon policy (Expected: ZERO rows)
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND ('public' = ANY(roles) OR 'anon' = ANY(roles))
ORDER BY tablename, policyname;

-- B. Any authenticated UPDATE/DELETE policy on users (Expected: ZERO rows)
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND cmd IN ('UPDATE','DELETE')
  AND 'service_role' <> ALL(roles);

-- C. Check all 32 expected tables have RLS enabled (Expected: exactly 32 rows and every rowsecurity = true)
SELECT t.tablename, t.rowsecurity
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN (
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
  )
ORDER BY t.tablename;

-- D. List all authenticated policies
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND 'authenticated' = ANY(roles)
ORDER BY tablename, policyname;

-- E. List all service_role policies
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND 'service_role' = ANY(roles)
ORDER BY tablename, policyname;

-- F. Check for policies that are still accidentally unrestricted
SELECT tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual = 'true'
    OR with_check = 'true'
  )
ORDER BY tablename, policyname;
