-- ==============================================================================
-- ONECOOLIE — JOURNEY PROTECTION & CLAIMS SCHEMA MIGRATION
-- System: Supabase / PostgreSQL 15+
-- Version: 1.0.0 (Production Verified & Idempotent)
-- ==============================================================================

-- 1. JOURNEY PROTECTION TABLE
CREATE TABLE IF NOT EXISTS public.journey_protection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protection_id TEXT UNIQUE NOT NULL,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    passenger_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.50 CHECK (price = 0.50),
    status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'active', 'cancelled', 'expired', 'refunded')),
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    gateway_order_id TEXT,
    gateway_payment_id TEXT,
    terms_version TEXT NOT NULL DEFAULT 'ONECOOLIE-PROTECTION-PRELAUNCH-v1',
    terms_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    -- Future insurance provider integration columns (strictly NULL until real integration)
    provider_id TEXT DEFAULT NULL,
    provider_name TEXT DEFAULT NULL,
    provider_policy_reference TEXT DEFAULT NULL,
    provider_certificate_reference TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent column additions in case table pre-existed
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS protection_id TEXT;
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS passenger_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) DEFAULT 0.50;
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_payment';
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS gateway_order_id TEXT;
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT 'ONECOOLIE-PROTECTION-PRELAUNCH-v1';
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT TRUE;
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS provider_id TEXT DEFAULT NULL;
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS provider_name TEXT DEFAULT NULL;
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS provider_policy_reference TEXT DEFAULT NULL;
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS provider_certificate_reference TEXT DEFAULT NULL;
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.journey_protection ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Partial unique index: Ensure at most one ACTIVE Journey Protection record exists per booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_journey_protection_active_booking 
ON public.journey_protection(booking_id) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_journey_protection_passenger_id ON public.journey_protection(passenger_id);
CREATE INDEX IF NOT EXISTS idx_journey_protection_booking_id ON public.journey_protection(booking_id);
CREATE INDEX IF NOT EXISTS idx_journey_protection_protection_id ON public.journey_protection(protection_id);

-- 2. FUTURE PROTECTION CLAIMS TABLE (Architecture Placeholder - Non-simulated)
CREATE TABLE IF NOT EXISTS public.protection_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id TEXT UNIQUE NOT NULL,
    protection_id UUID NOT NULL REFERENCES public.journey_protection(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    incident_date DATE NOT NULL,
    incident_description TEXT NOT NULL,
    document_references JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'closed')),
    provider_reference TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ DEFAULT NULL
);

-- Idempotent column additions
ALTER TABLE public.protection_claims ADD COLUMN IF NOT EXISTS claim_id TEXT;
ALTER TABLE public.protection_claims ADD COLUMN IF NOT EXISTS protection_id UUID REFERENCES public.journey_protection(id) ON DELETE CASCADE;
ALTER TABLE public.protection_claims ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.protection_claims ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;
ALTER TABLE public.protection_claims ADD COLUMN IF NOT EXISTS incident_date DATE;
ALTER TABLE public.protection_claims ADD COLUMN IF NOT EXISTS incident_description TEXT;
ALTER TABLE public.protection_claims ADD COLUMN IF NOT EXISTS document_references JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.protection_claims ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.protection_claims ADD COLUMN IF NOT EXISTS provider_reference TEXT DEFAULT NULL;
ALTER TABLE public.protection_claims ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.protection_claims ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.protection_claims ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_protection_claims_user_id ON public.protection_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_protection_claims_protection_id ON public.protection_claims(protection_id);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.journey_protection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protection_claims ENABLE ROW LEVEL SECURITY;

-- Service role full access (Express backend)
DROP POLICY IF EXISTS "Service role full access on journey_protection" ON public.journey_protection;
CREATE POLICY "Service role full access on journey_protection" 
ON public.journey_protection FOR ALL TO service_role 
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on protection_claims" ON public.protection_claims;
CREATE POLICY "Service role full access on protection_claims" 
ON public.protection_claims FOR ALL TO service_role 
USING (true) WITH CHECK (true);

-- Passenger isolation: Authenticated passengers can only view their own protection records
DROP POLICY IF EXISTS "Passengers can view own protection" ON public.journey_protection;
CREATE POLICY "Passengers can view own protection" 
ON public.journey_protection FOR SELECT TO authenticated 
USING (auth.uid() = passenger_id);

-- Passenger isolation: Authenticated passengers can only view their own claims
DROP POLICY IF EXISTS "Passengers can view own claims" ON public.protection_claims;
CREATE POLICY "Passengers can view own claims" 
ON public.protection_claims FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Passengers can create own claims" ON public.protection_claims;
CREATE POLICY "Passengers can create own claims" 
ON public.protection_claims FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);
