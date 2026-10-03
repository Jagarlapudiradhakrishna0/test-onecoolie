-- ==============================================================================
-- ONECOOLIE — AUTHORITATIVE MASTER DATABASE SCHEMA
-- Version: 3.1.0 Production Release (Self-Healing & Idempotent)
-- System: Supabase / PostgreSQL 15+
--
-- This is the single, authoritative master setup script for OneCoolie.
-- It can be executed on a fresh Supabase project or any pre-existing database.
-- It establishes all extensions, tables, constraints, indexes, immutable triggers,
-- RLS security policies, grants, and initial system seeds with complete
-- self-healing column repairs (ALTER TABLE ... ADD COLUMN IF NOT EXISTS).
-- ==============================================================================

-- ==============================================================================
-- SECTION 1 — EXTENSIONS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- SECTION 2 — TYPES / ENUMS
-- ==============================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('passenger', 'assistant', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role_enum') THEN
        CREATE TYPE admin_role_enum AS ENUM ('super_admin', 'finance_admin', 'support_admin', 'ops_admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status_enum') THEN
        CREATE TYPE booking_status_enum AS ENUM ('pending', 'accepted', 'arriving', 'in_service', 'completed', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
        CREATE TYPE payment_status_enum AS ENUM ('created', 'pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status_enum') THEN
        CREATE TYPE refund_status_enum AS ENUM ('pending', 'processing', 'processed', 'failed', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status_enum') THEN
        CREATE TYPE payout_status_enum AS ENUM ('requested', 'approved', 'processing', 'paid', 'rejected', 'cancelled', 'failed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority_enum') THEN
        CREATE TYPE ticket_priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status_enum') THEN
        CREATE TYPE ticket_status_enum AS ENUM ('open', 'in_progress', 'waiting_passenger', 'waiting_assistant', 'resolved', 'closed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_severity_enum') THEN
        CREATE TYPE incident_severity_enum AS ENUM ('info', 'low', 'medium', 'high', 'critical');
    END IF;
END $$;

-- ==============================================================================
-- SECTION 3 — TABLES & IDEMPOTENT COLUMN REPAIRS
-- ==============================================================================

-- 3.1 USERS TABLE (Core Directory & RBAC)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'assistant', 'admin')),
    admin_role TEXT DEFAULT NULL CHECK (admin_role IS NULL OR admin_role IN ('super_admin', 'finance_admin', 'support_admin', 'ops_admin')),
    station_code TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT FALSE,
    kyc_status TEXT DEFAULT 'not_submitted' CHECK (kyc_status IN ('not_submitted', 'pending', 'approved', 'rejected')),
    kyc_documents JSONB DEFAULT '{}'::jsonb,
    kyc_rejection_reason TEXT,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
    locked_until TIMESTAMPTZ DEFAULT NULL,
    last_login_at TIMESTAMPTZ DEFAULT NULL,
    last_password_change_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'passenger';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_role TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS station_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'not_submitted';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_documents JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_password_change_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.2 USER SESSIONS TABLE (Server-Side Session Store & Token Rotation)
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
    revocation_reason TEXT DEFAULT NULL CHECK (
        revocation_reason IS NULL OR revocation_reason IN (
            'logout',
            'rotation_reuse_detected',
            'admin_forced',
            'role_changed',
            'password_changed',
            'expired'
        )
    )
);

ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS family_id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS refresh_token_hash TEXT;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS device_info TEXT;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS revocation_reason TEXT DEFAULT NULL;

-- 3.3 ADMIN MFA TABLE (Admin TOTP Multi-Factor Authentication Store)
CREATE TABLE IF NOT EXISTS public.admin_mfa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    totp_secret_encrypted TEXT NOT NULL,
    totp_algorithm TEXT NOT NULL DEFAULT 'sha1' CHECK (totp_algorithm IN ('sha1', 'sha256', 'sha512')),
    totp_digits INTEGER NOT NULL DEFAULT 6 CHECK (totp_digits IN (6, 8)),
    totp_step_seconds INTEGER NOT NULL DEFAULT 30 CHECK (totp_step_seconds IN (30, 60)),
    is_mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enrolled_at TIMESTAMPTZ DEFAULT NULL,
    last_used_totp_timestamp BIGINT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_mfa ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.admin_mfa ADD COLUMN IF NOT EXISTS totp_secret_encrypted TEXT;
ALTER TABLE public.admin_mfa ADD COLUMN IF NOT EXISTS totp_algorithm TEXT DEFAULT 'sha1';
ALTER TABLE public.admin_mfa ADD COLUMN IF NOT EXISTS totp_digits INTEGER DEFAULT 6;
ALTER TABLE public.admin_mfa ADD COLUMN IF NOT EXISTS totp_step_seconds INTEGER DEFAULT 30;
ALTER TABLE public.admin_mfa ADD COLUMN IF NOT EXISTS is_mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.admin_mfa ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.admin_mfa ADD COLUMN IF NOT EXISTS last_used_totp_timestamp BIGINT DEFAULT NULL;
ALTER TABLE public.admin_mfa ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.admin_mfa ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.4 MFA RECOVERY CODES TABLE (Emergency MFA Fallback Codes)
CREATE TABLE IF NOT EXISTS public.mfa_recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_mfa_recovery_codes_user_code UNIQUE (user_id, code_hash)
);

ALTER TABLE public.mfa_recovery_codes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.mfa_recovery_codes ADD COLUMN IF NOT EXISTS code_hash TEXT;
ALTER TABLE public.mfa_recovery_codes ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.mfa_recovery_codes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.5 REFRESH TOKEN HISTORY TABLE (Replay Protection & Token Family Invalidation)
CREATE TABLE IF NOT EXISTS public.refresh_token_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,
    session_id UUID NOT NULL REFERENCES public.user_sessions(id) ON DELETE CASCADE,
    family_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consumed_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.refresh_token_history ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE public.refresh_token_history ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.user_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.refresh_token_history ADD COLUMN IF NOT EXISTS family_id UUID;
ALTER TABLE public.refresh_token_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.refresh_token_history ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.refresh_token_history ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.refresh_token_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.6 BOOKINGS TABLE (Ride Lifecycle & Booking Ledger)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id TEXT UNIQUE NOT NULL,
    passenger_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assistant_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    train_number TEXT NOT NULL,
    train_name TEXT NOT NULL,
    station_code TEXT NOT NULL,
    source TEXT,
    destination TEXT,
    journey_date TEXT NOT NULL,
    journey_time TEXT,
    service TEXT,
    services JSONB DEFAULT '{}'::jsonb,
    service_description TEXT,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
    payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('cash', 'online', 'upi', 'card', 'netbanking')),
    payment_id TEXT,
    booking_status TEXT NOT NULL DEFAULT 'pending' CHECK (booking_status IN ('pending', 'accepted', 'arriving', 'in_service', 'completed', 'cancelled')),
    assistant_status TEXT DEFAULT 'pending' CHECK (assistant_status IS NULL OR assistant_status IN ('pending', 'accepted', 'arriving', 'in_service', 'completed', 'cancelled')),
    start_otp TEXT,
    start_otp_verified BOOLEAN DEFAULT FALSE,
    start_otp_expires_at TIMESTAMPTZ,
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    review TEXT,
    sos_triggered BOOLEAN DEFAULT FALSE,
    sos_triggered_at TIMESTAMPTZ,
    service_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS passenger_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS train_number TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS train_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS station_code TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS journey_date TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS assistant_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS destination TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS journey_time TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service_description TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS assistant_status TEXT DEFAULT 'pending';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS start_otp TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS start_otp_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS start_otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS review TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS sos_triggered BOOLEAN DEFAULT FALSE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS sos_triggered_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service_started_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.7 CANCELLATION LOGS TABLE (Cancellation Audit & Reason Store)
CREATE TABLE IF NOT EXISTS public.cancellation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    passenger_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assistant_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    previous_status TEXT,
    new_status TEXT DEFAULT 'cancelled',
    reason_category TEXT,
    reason_details TEXT,
    refund_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    refund_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (refund_amount >= 0),
    cancellation_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cancellation_charge >= 0),
    payment_method TEXT,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    actor_role TEXT DEFAULT 'passenger',
    cancelled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_role TEXT,
    reason TEXT,
    cancellation_fee NUMERIC(10, 2) DEFAULT 0.00,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS passenger_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS assistant_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS previous_status TEXT;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS new_status TEXT DEFAULT 'cancelled';
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS reason_category TEXT;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS reason_details TEXT;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS refund_percentage NUMERIC(5, 2) DEFAULT 100.00;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS cancellation_charge NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS actor_role TEXT DEFAULT 'passenger';
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.cancellation_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.8 EMAIL OTPS TABLE (Secure Authentication OTPs)
CREATE TABLE IF NOT EXISTS public.email_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'login' CHECK (purpose IN ('login', 'signup')),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0 CHECK (attempts >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS otp_hash TEXT;
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'login';
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT FALSE;
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.9 PASSWORD RESETS TABLE (Password Reset Verification Store)
CREATE TABLE IF NOT EXISTS public.password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT FALSE;
ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.10 PAYMENTS TABLE (Authoritative Payment Ledger)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    passenger_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('cash', 'online', 'upi', 'card', 'netbanking')),
    payment_gateway TEXT DEFAULT 'razorpay',
    gateway_order_id TEXT,
    gateway_payment_id TEXT,
    gateway_signature TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('created', 'pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled')),
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS passenger_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'razorpay';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway_order_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway_signature TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.11 REFUNDS TABLE (Authoritative Refund Ledger)
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    passenger_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    payment_gateway TEXT DEFAULT 'razorpay',
    gateway_refund_id TEXT,
    gateway_payment_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'cancelled')),
    reason TEXT,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS passenger_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'razorpay';
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS gateway_refund_id TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.12 ASSISTANT EARNINGS TABLE (Commission Split & Wallet Ledger)
CREATE TABLE IF NOT EXISTS public.assistant_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    gross_amount NUMERIC(10, 2) NOT NULL CHECK (gross_amount >= 0),
    platform_commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 20.00 CHECK (platform_commission_percent >= 0 AND platform_commission_percent <= 100),
    platform_commission_amount NUMERIC(10, 2) NOT NULL CHECK (platform_commission_amount >= 0),
    assistant_amount NUMERIC(10, 2) NOT NULL CHECK (assistant_amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'held', 'paid_out', 'reversed')),
    available_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assistant_earnings_booking UNIQUE (booking_id)
);

ALTER TABLE public.assistant_earnings ADD COLUMN IF NOT EXISTS assistant_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.assistant_earnings ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;
ALTER TABLE public.assistant_earnings ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;
ALTER TABLE public.assistant_earnings ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.assistant_earnings ADD COLUMN IF NOT EXISTS platform_commission_percent NUMERIC(5, 2) DEFAULT 20.00;
ALTER TABLE public.assistant_earnings ADD COLUMN IF NOT EXISTS platform_commission_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.assistant_earnings ADD COLUMN IF NOT EXISTS assistant_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.assistant_earnings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.assistant_earnings ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ;
ALTER TABLE public.assistant_earnings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.assistant_earnings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.13 ASSISTANT PAYOUTS TABLE (Settlement Ledger)
CREATE TABLE IF NOT EXISTS public.assistant_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'requested' CHECK (
        status IN (
            'requested',
            'approved',
            'processing',
            'paid',
            'rejected',
            'cancelled',
            'failed'
        )
    ),
    payout_method TEXT CHECK (payout_method IS NULL OR payout_method IN ('upi', 'imps', 'neft', 'bank_transfer', 'cash', 'other', 'upi_manual')),
    payout_reference TEXT,
    gateway_payout_id TEXT,
    failure_reason TEXT,
    settlement_date TIMESTAMPTZ,
    settlement_notes TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS assistant_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'requested';
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS payout_method TEXT;
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS payout_reference TEXT;
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS gateway_payout_id TEXT;
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS settlement_date TIMESTAMPTZ;
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS settlement_notes TEXT;
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.assistant_payouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.14 ASSISTANT PAYOUT ITEMS TABLE (Explicit 1:1 Payout-to-Earning Item Mapping)
CREATE TABLE IF NOT EXISTS public.assistant_payout_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id UUID NOT NULL REFERENCES public.assistant_payouts(id) ON DELETE CASCADE,
    earning_id UUID NOT NULL REFERENCES public.assistant_earnings(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_assistant_payout_items_earning UNIQUE (earning_id)
);

ALTER TABLE public.assistant_payout_items ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES public.assistant_payouts(id) ON DELETE CASCADE;
ALTER TABLE public.assistant_payout_items ADD COLUMN IF NOT EXISTS earning_id UUID REFERENCES public.assistant_earnings(id) ON DELETE RESTRICT;
ALTER TABLE public.assistant_payout_items ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.assistant_payout_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.15 FINANCIAL AUDIT LOGS TABLE (Immutable Append-Only Financial Audit Trail)
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    actor_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    payout_id UUID REFERENCES public.assistant_payouts(id) ON DELETE SET NULL,
    old_state JSONB,
    new_state JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.financial_audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.financial_audit_logs ADD COLUMN IF NOT EXISTS actor_role TEXT;
ALTER TABLE public.financial_audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.financial_audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.financial_audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE public.financial_audit_logs ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
ALTER TABLE public.financial_audit_logs ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;
ALTER TABLE public.financial_audit_logs ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES public.assistant_payouts(id) ON DELETE SET NULL;
ALTER TABLE public.financial_audit_logs ADD COLUMN IF NOT EXISTS old_state JSONB;
ALTER TABLE public.financial_audit_logs ADD COLUMN IF NOT EXISTS new_state JSONB;
ALTER TABLE public.financial_audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.financial_audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.financial_audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.16 FINANCIAL INCIDENTS TABLE (Financial Ledger Reconciliation Incidents)
CREATE TABLE IF NOT EXISTS public.financial_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'investigating', 'resolved', 'dismissed')),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    payout_id UUID REFERENCES public.assistant_payouts(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    discrepancy_details JSONB DEFAULT '{}'::jsonb,
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.financial_incidents ADD COLUMN IF NOT EXISTS incident_type TEXT;
ALTER TABLE public.financial_incidents ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium';
ALTER TABLE public.financial_incidents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE public.financial_incidents ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
ALTER TABLE public.financial_incidents ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;
ALTER TABLE public.financial_incidents ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES public.assistant_payouts(id) ON DELETE SET NULL;
ALTER TABLE public.financial_incidents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.financial_incidents ADD COLUMN IF NOT EXISTS discrepancy_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.financial_incidents ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.financial_incidents ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE public.financial_incidents ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.financial_incidents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.financial_incidents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.17 PAYMENT WEBHOOK EVENTS TABLE (Idempotency Ledger for Gateway Events)
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway TEXT NOT NULL DEFAULT 'razorpay',
    gateway_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    processing_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payment_webhook_events ADD COLUMN IF NOT EXISTS gateway TEXT DEFAULT 'razorpay';
ALTER TABLE public.payment_webhook_events ADD COLUMN IF NOT EXISTS gateway_event_id TEXT;
ALTER TABLE public.payment_webhook_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.payment_webhook_events ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;
ALTER TABLE public.payment_webhook_events ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
ALTER TABLE public.payment_webhook_events ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.payment_webhook_events ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.payment_webhook_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE public.payment_webhook_events ADD COLUMN IF NOT EXISTS processing_error TEXT;
ALTER TABLE public.payment_webhook_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.18 ADMIN AUDIT LOGS TABLE (Immutable Administrative Audit Trail)
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

ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS actor_admin_role TEXT;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS resource_type TEXT;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS resource_id TEXT;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS request_id TEXT;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.admin_audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.19 SECURITY EVENTS TABLE (Forensic Security Anomaly Log)
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.user_sessions(id) ON DELETE SET NULL,
    family_id UUID,
    ip_address TEXT,
    user_agent TEXT,
    request_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info';
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.user_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS family_id UUID;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS request_id TEXT;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.security_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.20 SECURITY INCIDENTS TABLE (Aggregated Security Incident Store)
CREATE TABLE IF NOT EXISTS public.security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'mitigated', 'resolved', 'false_positive')),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    family_id UUID,
    ip_address TEXT,
    summary TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS incident_type TEXT;
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium';
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS family_id UUID;
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.security_incidents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.21 SECURITY INCIDENT EVENTS TABLE (Incident-to-Event Mapping)
CREATE TABLE IF NOT EXISTS public.security_incident_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES public.security_incidents(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.security_events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_security_incident_events UNIQUE (incident_id, event_id)
);

ALTER TABLE public.security_incident_events ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES public.security_incidents(id) ON DELETE CASCADE;
ALTER TABLE public.security_incident_events ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.security_events(id) ON DELETE CASCADE;
ALTER TABLE public.security_incident_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.22 SECURITY RESPONSE ACTIONS TABLE (Automated Countermeasures Log)
CREATE TABLE IF NOT EXISTS public.security_response_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES public.security_incidents(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('user', 'session', 'family', 'ip')),
    target_id TEXT NOT NULL,
    executed_by TEXT NOT NULL DEFAULT 'automated_system',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.security_response_actions ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES public.security_incidents(id) ON DELETE SET NULL;
ALTER TABLE public.security_response_actions ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE public.security_response_actions ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE public.security_response_actions ADD COLUMN IF NOT EXISTS target_id TEXT;
ALTER TABLE public.security_response_actions ADD COLUMN IF NOT EXISTS executed_by TEXT DEFAULT 'automated_system';
ALTER TABLE public.security_response_actions ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.security_response_actions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.23 ACTIVITY LOGS TABLE (Operational Audit Log)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.24 SOS ALERTS TABLE (Emergency Event Log)
CREATE TABLE IF NOT EXISTS public.sos_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    passenger_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    station_code TEXT NOT NULL,
    train_no TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sos_alerts ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;
ALTER TABLE public.sos_alerts ADD COLUMN IF NOT EXISTS passenger_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.sos_alerts ADD COLUMN IF NOT EXISTS station_code TEXT;
ALTER TABLE public.sos_alerts ADD COLUMN IF NOT EXISTS train_no TEXT;
ALTER TABLE public.sos_alerts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.sos_alerts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.25 SUPPORT TICKETS TABLE (Customer Support & Ticket Store)
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    passenger_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assistant_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'General',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_passenger', 'waiting_assistant', 'resolved', 'closed')),
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS ticket_number TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS passenger_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS assistant_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.26 NOTIFICATIONS TABLE (User Alerts & Notification Store)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'booking', 'payment', 'payout', 'security', 'sos', 'system')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.27 DEPLOYMENT VERIFICATIONS TABLE (CI/CD Deployment Audit)
CREATE TABLE IF NOT EXISTS public.deployment_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'warning')),
    checks JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary TEXT NOT NULL,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.deployment_verifications ADD COLUMN IF NOT EXISTS environment TEXT;
ALTER TABLE public.deployment_verifications ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.deployment_verifications ADD COLUMN IF NOT EXISTS checks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.deployment_verifications ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.deployment_verifications ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.deployment_verifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.28 RECOVERY VERIFICATIONS TABLE (Disaster Recovery & Backup Audit)
CREATE TABLE IF NOT EXISTS public.recovery_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL CHECK (status IN ('verified', 'unverified', 'failed')),
    backup_timestamp TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.recovery_verifications ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.recovery_verifications ADD COLUMN IF NOT EXISTS backup_timestamp TIMESTAMPTZ;
ALTER TABLE public.recovery_verifications ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.recovery_verifications ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.recovery_verifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3.29 APPLICATION OPERATIONAL EVENTS TABLE (Application Telemetry Log)
CREATE TABLE IF NOT EXISTS public.application_operational_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.application_operational_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.application_operational_events ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info';
ALTER TABLE public.application_operational_events ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.application_operational_events ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.application_operational_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.30 PRODUCTION VALIDATION SESSIONS TABLE (Dry-Run Deployment Validation)
CREATE TABLE IF NOT EXISTS public.production_validation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment TEXT NOT NULL DEFAULT 'production',
    target_version TEXT NOT NULL,
    commit_hash TEXT,
    initiated_by UUID REFERENCES public.users(id) ON DELETE RESTRICT,
    initiated_by_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed_pending_review', 'certified', 'aborted', 'failed')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    aborted_at TIMESTAMPTZ,
    abort_reason TEXT,
    results JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.production_validation_sessions ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production';
ALTER TABLE public.production_validation_sessions ADD COLUMN IF NOT EXISTS target_version TEXT;
ALTER TABLE public.production_validation_sessions ADD COLUMN IF NOT EXISTS commit_hash TEXT;
ALTER TABLE public.production_validation_sessions ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES public.users(id) ON DELETE RESTRICT;
ALTER TABLE public.production_validation_sessions ADD COLUMN IF NOT EXISTS initiated_by_email TEXT;
ALTER TABLE public.production_validation_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';
ALTER TABLE public.production_validation_sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.production_validation_sessions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.production_validation_sessions ADD COLUMN IF NOT EXISTS aborted_at TIMESTAMPTZ;
ALTER TABLE public.production_validation_sessions ADD COLUMN IF NOT EXISTS abort_reason TEXT;
ALTER TABLE public.production_validation_sessions ADD COLUMN IF NOT EXISTS results JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.production_validation_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.production_validation_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.production_validation_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.31 PRODUCTION VALIDATION EVIDENCE TABLE (Immutable Dry-Run Evidence Ledger)
CREATE TABLE IF NOT EXISTS public.production_validation_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.production_validation_sessions(id) ON DELETE CASCADE,
    step INTEGER NOT NULL CHECK (step >= 1 AND step <= 10),
    step_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'blocked', 'skipped')),
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    hash_sha256 TEXT NOT NULL,
    recorded_by UUID REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_validation_session_step UNIQUE (session_id, step)
);

ALTER TABLE public.production_validation_evidence ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.production_validation_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.production_validation_evidence ADD COLUMN IF NOT EXISTS step INTEGER;
ALTER TABLE public.production_validation_evidence ADD COLUMN IF NOT EXISTS step_name TEXT;
ALTER TABLE public.production_validation_evidence ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.production_validation_evidence ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;
ALTER TABLE public.production_validation_evidence ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;
ALTER TABLE public.production_validation_evidence ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.production_validation_evidence ADD COLUMN IF NOT EXISTS hash_sha256 TEXT;
ALTER TABLE public.production_validation_evidence ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES public.users(id) ON DELETE RESTRICT;
ALTER TABLE public.production_validation_evidence ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3.32 PRODUCTION LAUNCH CERTIFICATIONS TABLE (Immutable Release Certificate)
CREATE TABLE IF NOT EXISTS public.production_launch_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_session_id UUID NOT NULL REFERENCES public.production_validation_sessions(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
    certified_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    certified_by_role TEXT NOT NULL CHECK (certified_by_role IN ('super_admin', 'security_officer', 'lead_architect')),
    signature_hash TEXT NOT NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.production_launch_certifications ADD COLUMN IF NOT EXISTS validation_session_id UUID REFERENCES public.production_validation_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.production_launch_certifications ADD COLUMN IF NOT EXISTS decision TEXT;
ALTER TABLE public.production_launch_certifications ADD COLUMN IF NOT EXISTS certified_by UUID REFERENCES public.users(id) ON DELETE RESTRICT;
ALTER TABLE public.production_launch_certifications ADD COLUMN IF NOT EXISTS certified_by_role TEXT;
ALTER TABLE public.production_launch_certifications ADD COLUMN IF NOT EXISTS signature_hash TEXT;
ALTER TABLE public.production_launch_certifications ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.production_launch_certifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.production_launch_certifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ==============================================================================
-- SECTION 4 — CONSTRAINTS
-- ==============================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_assistant_earnings_booking') THEN
        ALTER TABLE public.assistant_earnings ADD CONSTRAINT uq_assistant_earnings_booking UNIQUE (booking_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_assistant_payout_items_earning') THEN
        ALTER TABLE public.assistant_payout_items ADD CONSTRAINT uq_assistant_payout_items_earning UNIQUE (earning_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_mfa_recovery_codes_user_code') THEN
        ALTER TABLE public.mfa_recovery_codes ADD CONSTRAINT uq_mfa_recovery_codes_user_code UNIQUE (user_id, code_hash);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_validation_session_step') THEN
        ALTER TABLE public.production_validation_evidence ADD CONSTRAINT uq_validation_session_step UNIQUE (session_id, step);
    END IF;
END $$;

-- ==============================================================================
-- SECTION 5 — INDEXES
-- ==============================================================================

-- 5.1 Users Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_admin_role ON public.users(admin_role) WHERE role = 'admin';
CREATE INDEX IF NOT EXISTS idx_users_station ON public.users(station_code);
CREATE INDEX IF NOT EXISTS idx_users_online ON public.users(is_online) WHERE role = 'assistant';
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON public.users(locked_until) WHERE locked_until IS NOT NULL;

-- 5.2 User Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_family_id ON public.user_sessions(family_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON public.user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_lookup ON public.user_sessions(user_id, expires_at) WHERE revoked_at IS NULL;

-- 5.3 MFA Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_mfa_user_id ON public.admin_mfa(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_recovery_codes_unused ON public.mfa_recovery_codes(user_id) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_refresh_token_history_hash ON public.refresh_token_history(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_token_history_family ON public.refresh_token_history(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_history_user ON public.refresh_token_history(user_id);

-- 5.4 Bookings Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON public.bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_passenger_id ON public.bookings(passenger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_assistant_id ON public.bookings(assistant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_station_code ON public.bookings(station_code);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_sos ON public.bookings(sos_triggered) WHERE sos_triggered = TRUE;

-- 5.5 Cancellation Logs Indexes
CREATE INDEX IF NOT EXISTS idx_cancellation_logs_booking_id ON public.cancellation_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_logs_passenger_id ON public.cancellation_logs(passenger_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_logs_actor_id ON public.cancellation_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_logs_cancelled_by ON public.cancellation_logs(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_cancellation_logs_created_at ON public.cancellation_logs(created_at DESC);

-- 5.6 Email OTPs & Password Resets Indexes
CREATE INDEX IF NOT EXISTS idx_email_otps_email ON public.email_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_otps_expires ON public.email_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON public.password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON public.password_resets(user_id);

-- 5.7 Payments Indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_passenger_id ON public.payments(passenger_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order_id ON public.payments(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id ON public.payments(gateway_payment_id);

-- 5.8 Refunds Indexes
CREATE INDEX IF NOT EXISTS idx_refunds_booking_id ON public.refunds(booking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_passenger_id ON public.refunds(passenger_id);
CREATE INDEX IF NOT EXISTS idx_refunds_gateway_refund_id ON public.refunds(gateway_refund_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON public.refunds(created_at DESC);

-- 5.9 Assistant Earnings Indexes
CREATE INDEX IF NOT EXISTS idx_assistant_earnings_assistant_id ON public.assistant_earnings(assistant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_earnings_booking_id ON public.assistant_earnings(booking_id);
CREATE INDEX IF NOT EXISTS idx_assistant_earnings_payment_id ON public.assistant_earnings(payment_id);
CREATE INDEX IF NOT EXISTS idx_assistant_earnings_status ON public.assistant_earnings(status);
CREATE INDEX IF NOT EXISTS idx_assistant_earnings_created_at ON public.assistant_earnings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_earnings_available_at ON public.assistant_earnings(available_at);

-- 5.10 Assistant Payouts Indexes
CREATE INDEX IF NOT EXISTS idx_assistant_payouts_assistant_id ON public.assistant_payouts(assistant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_payouts_status ON public.assistant_payouts(status);
CREATE INDEX IF NOT EXISTS idx_assistant_payouts_created_at ON public.assistant_payouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_payouts_reference ON public.assistant_payouts(payout_reference);
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_assistant_payouts_reference_paid
    ON public.assistant_payouts(payout_reference)
    WHERE status = 'paid' AND payout_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payout_items_payout_id ON public.assistant_payout_items(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_items_earning_id ON public.assistant_payout_items(earning_id);

-- 5.11 Financial Audit & Incidents Indexes
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.financial_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.financial_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_booking_id ON public.financial_audit_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_payment_id ON public.financial_audit_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_audit_payout_id ON public.financial_audit_logs(payout_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.financial_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_incidents_status ON public.financial_incidents(status);
CREATE INDEX IF NOT EXISTS idx_financial_incidents_severity ON public.financial_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_financial_incidents_type ON public.financial_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_financial_incidents_booking ON public.financial_incidents(booking_id);
CREATE INDEX IF NOT EXISTS idx_financial_incidents_payment ON public.financial_incidents(payment_id);
CREATE INDEX IF NOT EXISTS idx_financial_incidents_payout ON public.financial_incidents(payout_id);
CREATE INDEX IF NOT EXISTS idx_financial_incidents_created_at ON public.financial_incidents(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_incidents_active_dedup
    ON public.financial_incidents (incident_type, COALESCE(payment_id, '00000000-0000-0000-0000-000000000000'::uuid))
    WHERE status IN ('open', 'acknowledged', 'investigating');

-- 5.12 Webhooks, Admin Audit & Security Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_gateway_event_id ON public.payment_webhook_events(gateway_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_payment_id ON public.payment_webhook_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_booking_id ON public.payment_webhook_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON public.payment_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.payment_webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor_id ON public.admin_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_resource ON public.admin_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_request_id ON public.admin_audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_result ON public.admin_audit_logs(result);

-- 5.13 Security Events & Incidents Indexes
CREATE INDEX IF NOT EXISTS idx_security_events_user ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_session ON public.security_events(session_id);
CREATE INDEX IF NOT EXISTS idx_security_events_family ON public.security_events(family_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON public.security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON public.security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_user ON public.security_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_security_response_actions_incident ON public.security_response_actions(incident_id);

-- 5.14 Activity, SOS, Support Tickets & Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_booking_id ON public.sos_alerts(booking_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_passenger_id ON public.sos_alerts(passenger_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_station_code ON public.sos_alerts(station_code);
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON public.support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON public.support_tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_support_tickets_passenger ON public.support_tickets(passenger_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assistant ON public.support_tickets(assistant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_booking ON public.support_tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = FALSE;

-- 5.15 Reliability & Validation Indexes
CREATE INDEX IF NOT EXISTS idx_deployment_verifications_status ON public.deployment_verifications(status);
CREATE INDEX IF NOT EXISTS idx_deployment_verifications_env ON public.deployment_verifications(environment);
CREATE INDEX IF NOT EXISTS idx_deployment_verifications_created_at ON public.deployment_verifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_verifications_status ON public.recovery_verifications(status);
CREATE INDEX IF NOT EXISTS idx_app_operational_events_type ON public.application_operational_events(event_type);
CREATE INDEX IF NOT EXISTS idx_app_operational_events_severity ON public.application_operational_events(severity);
CREATE INDEX IF NOT EXISTS idx_app_operational_events_created_at ON public.application_operational_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_sessions_status ON public.production_validation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_validation_sessions_started_at ON public.production_validation_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_evidence_session_id ON public.production_validation_evidence(session_id);
CREATE INDEX IF NOT EXISTS idx_validation_evidence_step ON public.production_validation_evidence(step);
CREATE INDEX IF NOT EXISTS idx_validation_evidence_created_at ON public.production_validation_evidence(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_launch_certifications_decision ON public.production_launch_certifications(decision);
CREATE INDEX IF NOT EXISTS idx_launch_certifications_session_id ON public.production_launch_certifications(validation_session_id);
CREATE INDEX IF NOT EXISTS idx_launch_certifications_created_at ON public.production_launch_certifications(created_at DESC);

-- ==============================================================================
-- SECTION 6 — FUNCTIONS
-- ==============================================================================

-- 6.1 Updated At Automatic Refresh Function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6.2 Financial Audit Immutability Enforcement Function
CREATE OR REPLACE FUNCTION public.prevent_financial_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Policy Violation: financial_audit_logs is an immutable append-only ledger. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

-- 6.3 Validation Evidence Immutability Enforcement Function
CREATE OR REPLACE FUNCTION public.prevent_evidence_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Policy Violation: production_validation_evidence is an immutable append-only ledger. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

-- 6.4 Launch Certification Immutability Enforcement Function
CREATE OR REPLACE FUNCTION public.prevent_certification_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Policy Violation: production_launch_certifications is an immutable append-only ledger. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

-- 6.5 Admin Audit Log Immutability Enforcement Function
CREATE OR REPLACE FUNCTION public.prevent_admin_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Policy Violation: admin_audit_logs records are strictly immutable. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- SECTION 7 — TRIGGERS
-- ==============================================================================

-- 7.1 Updated At Triggers
DROP TRIGGER IF EXISTS set_timestamp_users ON public.users;
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_set_timestamp_admin_mfa ON public.admin_mfa;
CREATE TRIGGER trg_set_timestamp_admin_mfa
BEFORE UPDATE ON public.admin_mfa
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_bookings ON public.bookings;
CREATE TRIGGER set_timestamp_bookings
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_payments ON public.payments;
CREATE TRIGGER set_timestamp_payments
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_refunds ON public.refunds;
CREATE TRIGGER set_timestamp_refunds
BEFORE UPDATE ON public.refunds
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_assistant_earnings ON public.assistant_earnings;
CREATE TRIGGER set_timestamp_assistant_earnings
BEFORE UPDATE ON public.assistant_earnings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_assistant_payouts ON public.assistant_payouts;
CREATE TRIGGER set_timestamp_assistant_payouts
BEFORE UPDATE ON public.assistant_payouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_financial_incidents ON public.financial_incidents;
CREATE TRIGGER set_timestamp_financial_incidents
BEFORE UPDATE ON public.financial_incidents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_support_tickets ON public.support_tickets;
CREATE TRIGGER set_timestamp_support_tickets
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_security_incidents ON public.security_incidents;
CREATE TRIGGER set_timestamp_security_incidents
BEFORE UPDATE ON public.security_incidents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_validation_sessions ON public.production_validation_sessions;
CREATE TRIGGER set_timestamp_validation_sessions
BEFORE UPDATE ON public.production_validation_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7.2 Immutability Enforcement Triggers
DROP TRIGGER IF EXISTS trg_prevent_financial_audit_mutation ON public.financial_audit_logs;
CREATE TRIGGER trg_prevent_financial_audit_mutation
BEFORE UPDATE OR DELETE ON public.financial_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_audit_mutation();

DROP TRIGGER IF EXISTS trg_immutable_admin_audit_logs ON public.admin_audit_logs;
CREATE TRIGGER trg_immutable_admin_audit_logs
BEFORE UPDATE OR DELETE ON public.admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_admin_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_prevent_evidence_mutation ON public.production_validation_evidence;
CREATE TRIGGER trg_prevent_evidence_mutation
BEFORE UPDATE OR DELETE ON public.production_validation_evidence
FOR EACH ROW EXECUTE FUNCTION public.prevent_evidence_ledger_mutation();

DROP TRIGGER IF EXISTS trg_prevent_certification_mutation ON public.production_launch_certifications;
CREATE TRIGGER trg_prevent_certification_mutation
BEFORE UPDATE OR DELETE ON public.production_launch_certifications
FOR EACH ROW EXECUTE FUNCTION public.prevent_certification_mutation();

-- ==============================================================================
-- SECTION 8 — RLS ENABLEMENT (All 32 Tables)
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
-- SECTION 9 — RLS POLICIES (Zero Insecure Public Bypasses)
-- ==============================================================================

-- 9.1 SERVICE ROLE FULL ACCESS (Backend Authoritative Operations)
DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users" ON public.users
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on user_sessions" ON public.user_sessions;
CREATE POLICY "Service role full access on user_sessions" ON public.user_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on admin_mfa" ON public.admin_mfa;
CREATE POLICY "Service role full access on admin_mfa" ON public.admin_mfa
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on mfa_recovery_codes" ON public.mfa_recovery_codes;
CREATE POLICY "Service role full access on mfa_recovery_codes" ON public.mfa_recovery_codes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on refresh_token_history" ON public.refresh_token_history;
CREATE POLICY "Service role full access on refresh_token_history" ON public.refresh_token_history
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on bookings" ON public.bookings;
CREATE POLICY "Service role full access on bookings" ON public.bookings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on cancellation_logs" ON public.cancellation_logs;
CREATE POLICY "Service role full access on cancellation_logs" ON public.cancellation_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on email_otps" ON public.email_otps;
CREATE POLICY "Service role full access on email_otps" ON public.email_otps
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on password_resets" ON public.password_resets;
CREATE POLICY "Service role full access on password_resets" ON public.password_resets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on payments" ON public.payments;
CREATE POLICY "Service role full access on payments" ON public.payments
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on refunds" ON public.refunds;
CREATE POLICY "Service role full access on refunds" ON public.refunds
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on assistant_earnings" ON public.assistant_earnings;
CREATE POLICY "Service role full access on assistant_earnings" ON public.assistant_earnings
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on assistant_payouts" ON public.assistant_payouts;
CREATE POLICY "Service role full access on assistant_payouts" ON public.assistant_payouts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on assistant_payout_items" ON public.assistant_payout_items;
CREATE POLICY "Service role full access on assistant_payout_items" ON public.assistant_payout_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on financial_audit_logs" ON public.financial_audit_logs;
CREATE POLICY "Service role full access on financial_audit_logs" ON public.financial_audit_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on financial_incidents" ON public.financial_incidents;
CREATE POLICY "Service role full access on financial_incidents" ON public.financial_incidents
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on payment_webhook_events" ON public.payment_webhook_events;
CREATE POLICY "Service role full access on payment_webhook_events" ON public.payment_webhook_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on admin_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "Service role full access on admin_audit_logs" ON public.admin_audit_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on security_events" ON public.security_events;
CREATE POLICY "Service role full access on security_events" ON public.security_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on security_incidents" ON public.security_incidents;
CREATE POLICY "Service role full access on security_incidents" ON public.security_incidents
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on security_incident_events" ON public.security_incident_events;
CREATE POLICY "Service role full access on security_incident_events" ON public.security_incident_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on security_response_actions" ON public.security_response_actions;
CREATE POLICY "Service role full access on security_response_actions" ON public.security_response_actions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on activity_logs" ON public.activity_logs;
CREATE POLICY "Service role full access on activity_logs" ON public.activity_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on sos_alerts" ON public.sos_alerts;
CREATE POLICY "Service role full access on sos_alerts" ON public.sos_alerts
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on support_tickets" ON public.support_tickets;
CREATE POLICY "Service role full access on support_tickets" ON public.support_tickets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on notifications" ON public.notifications;
CREATE POLICY "Service role full access on notifications" ON public.notifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on deployment_verifications" ON public.deployment_verifications;
CREATE POLICY "Service role full access on deployment_verifications" ON public.deployment_verifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on recovery_verifications" ON public.recovery_verifications;
CREATE POLICY "Service role full access on recovery_verifications" ON public.recovery_verifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on application_operational_events" ON public.application_operational_events;
CREATE POLICY "Service role full access on application_operational_events" ON public.application_operational_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on production_validation_sessions" ON public.production_validation_sessions;
CREATE POLICY "Service role full access on production_validation_sessions" ON public.production_validation_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on production_validation_evidence" ON public.production_validation_evidence;
CREATE POLICY "Service role full access on production_validation_evidence" ON public.production_validation_evidence
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on production_launch_certifications" ON public.production_launch_certifications;
CREATE POLICY "Service role full access on production_launch_certifications" ON public.production_launch_certifications
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9.2 USER OWNERSHIP ACCESS POLICIES (Client-Side Authenticated Access)

-- Users Table Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Bookings Table Policies
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT TO authenticated USING (auth.uid() = passenger_id OR auth.uid() = assistant_id);

DROP POLICY IF EXISTS "Passengers can create bookings" ON public.bookings;
CREATE POLICY "Passengers can create bookings" ON public.bookings
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = passenger_id);

-- Payments Table Policies (Strict Passenger Read Isolation)
DROP POLICY IF EXISTS "Passengers can view own payments" ON public.payments;
CREATE POLICY "Passengers can view own payments" ON public.payments
    FOR SELECT TO authenticated USING (auth.uid() = passenger_id);

-- Refunds Table Policies (Strict Passenger Read Isolation)
DROP POLICY IF EXISTS "Passengers can view own refunds" ON public.refunds;
CREATE POLICY "Passengers can view own refunds" ON public.refunds
    FOR SELECT TO authenticated USING (auth.uid() = passenger_id);

-- Assistant Earnings Table Policies (Strict Assistant Isolation)
DROP POLICY IF EXISTS "Assistants can view own earnings" ON public.assistant_earnings;
CREATE POLICY "Assistants can view own earnings" ON public.assistant_earnings
    FOR SELECT TO authenticated USING (auth.uid() = assistant_id);

-- Assistant Payouts Table Policies (Strict Assistant Isolation)
DROP POLICY IF EXISTS "Assistants can view own payouts" ON public.assistant_payouts;
CREATE POLICY "Assistants can view own payouts" ON public.assistant_payouts
    FOR SELECT TO authenticated USING (auth.uid() = assistant_id);

-- Assistant Payout Items Table Policies
DROP POLICY IF EXISTS "Assistants can view own payout items" ON public.assistant_payout_items;
CREATE POLICY "Assistants can view own payout items" ON public.assistant_payout_items
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.assistant_payouts
            WHERE assistant_payouts.id = assistant_payout_items.payout_id
              AND assistant_payouts.assistant_id = auth.uid()
        )
    );

-- Support Tickets Table Policies
DROP POLICY IF EXISTS "Users can view own support tickets" ON public.support_tickets;
CREATE POLICY "Users can view own support tickets" ON public.support_tickets
    FOR SELECT TO authenticated USING (
        auth.uid() = passenger_id OR
        auth.uid() = created_by OR
        auth.uid() = assistant_id
    );

DROP POLICY IF EXISTS "Users can create own support tickets" ON public.support_tickets;
CREATE POLICY "Users can create own support tickets" ON public.support_tickets
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = created_by OR
        auth.uid() = passenger_id
    );

-- Notifications Table Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SOS Alerts Table Policies
DROP POLICY IF EXISTS "Passengers can view own sos alerts" ON public.sos_alerts;
CREATE POLICY "Passengers can view own sos alerts" ON public.sos_alerts
    FOR SELECT TO authenticated USING (auth.uid() = passenger_id);

-- 9.3 ADMIN GOVERNANCE POLICIES (Super Admin & Admin Delegation)
DROP POLICY IF EXISTS "Admins have full access to users" ON public.users;
CREATE POLICY "Admins have full access to users" ON public.users
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

DROP POLICY IF EXISTS "Admins have full access to bookings" ON public.bookings;
CREATE POLICY "Admins have full access to bookings" ON public.bookings
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

DROP POLICY IF EXISTS "Admins have full access to assistant_payouts" ON public.assistant_payouts;
CREATE POLICY "Admins have full access to assistant_payouts" ON public.assistant_payouts
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

DROP POLICY IF EXISTS "Admins have full access to assistant_payout_items" ON public.assistant_payout_items;
CREATE POLICY "Admins have full access to assistant_payout_items" ON public.assistant_payout_items
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can view financial audit logs" ON public.financial_audit_logs;
CREATE POLICY "Admins can view financial audit logs" ON public.financial_audit_logs
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

DROP POLICY IF EXISTS "Admins have full access to financial incidents" ON public.financial_incidents;
CREATE POLICY "Admins have full access to financial incidents" ON public.financial_incidents
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

DROP POLICY IF EXISTS "Admins have full access to support tickets" ON public.support_tickets;
CREATE POLICY "Admins have full access to support tickets" ON public.support_tickets
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

DROP POLICY IF EXISTS "Admins have full access to validation sessions" ON public.production_validation_sessions;
CREATE POLICY "Admins have full access to validation sessions" ON public.production_validation_sessions
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can view validation evidence" ON public.production_validation_evidence;
CREATE POLICY "Admins can view validation evidence" ON public.production_validation_evidence
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can view launch certifications" ON public.production_launch_certifications;
CREATE POLICY "Admins can view launch certifications" ON public.production_launch_certifications
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- ==============================================================================
-- SECTION 10 — GRANTS
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Service role has comprehensive permissions for authoritative backend operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Authenticated users have scoped operational permissions subject to RLS
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT ON public.refunds TO authenticated;
GRANT SELECT ON public.assistant_earnings TO authenticated;
GRANT SELECT, UPDATE ON public.assistant_payouts TO authenticated;
GRANT SELECT ON public.assistant_payout_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT ON public.sos_alerts TO authenticated;
GRANT SELECT ON public.financial_audit_logs TO authenticated;
GRANT SELECT, UPDATE ON public.financial_incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.production_validation_sessions TO authenticated;
GRANT SELECT, INSERT ON public.production_validation_evidence TO authenticated;
GRANT SELECT, INSERT ON public.production_launch_certifications TO authenticated;

-- Public / Anonymous users have ZERO direct table access (backend proxies via service_role)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- ==============================================================================
-- SECTION 11 — REQUIRED SEED DATA
-- ==============================================================================

-- Initial Operational Telemetry Seed
INSERT INTO public.application_operational_events (event_type, severity, message, details)
VALUES (
    'system_schema_initialized',
    'info',
    'ONECOOLIE master schema initialized successfully with RLS security policies.',
    jsonb_build_object(
        'version', '3.1.0',
        'schema', 'ONECOOLIE_MASTER_SCHEMA.sql',
        'initialized_at', NOW()
    )
)
ON CONFLICT DO NOTHING;

-- Verification of Schema Integrity
SELECT 'ONECOOLIE Master Schema Successfully Initialized' AS status, COUNT(*) AS total_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';
