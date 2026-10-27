-- =============================================================================
-- ONECOOLIE — PRODUCTION-GRADE ONLINE/OFFLINE PAYMENTS & CASH COLLECTION SEPARATION
-- MIGRATION: ONECOOLIE_PAYMENTS_CASH_SEPARATION_MIGRATION.sql
--
-- Core Financial Objectives:
-- 1. Strictly separate genuine Razorpay digital payments from physical cash collections.
-- 2. Create authoritative `cash_collections` ledger for all offline assistance jobs.
-- 3. Add canonical financial state columns to `bookings` and `payments`.
-- 4. Enable cash reimbursement tracking for cancelled bookings where cash was collected.
-- 5. Safe backward-compatible backfill for historical cash and online records.
--
-- Apply in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ADD CANONICAL STATE COLUMNS TO `bookings` (ADDITIVE ONLY)
-- -----------------------------------------------------------------------------
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS collection_status TEXT NOT NULL DEFAULT 'not_applicable';

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS cash_collected_at TIMESTAMPTZ;

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS cash_confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_collection_status 
ON public.bookings(collection_status);

CREATE INDEX IF NOT EXISTS idx_bookings_payment_channel 
ON public.bookings(payment_method, payment_status);

-- -----------------------------------------------------------------------------
-- 2. ADD CHANNEL ISOLATION COLUMN TO `payments` (ADDITIVE ONLY)
-- -----------------------------------------------------------------------------
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'online';

CREATE INDEX IF NOT EXISTS idx_payments_channel 
ON public.payments(channel, status);

CREATE INDEX IF NOT EXISTS idx_payments_gateway_order 
ON public.payments(gateway_order_id);

CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment 
ON public.payments(gateway_payment_id);

-- -----------------------------------------------------------------------------
-- 3. CREATE DEDICATED `cash_collections` LEDGER TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    passenger_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assistant_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    expected_amount NUMERIC(10, 2) NOT NULL CHECK (expected_amount >= 0),
    expected_amount_paise BIGINT NOT NULL CHECK (expected_amount_paise >= 0),
    collected_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (collected_amount >= 0),
    collected_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (collected_amount_paise >= 0),
    status TEXT NOT NULL DEFAULT 'awaiting_collection' CHECK (
        status IN ('awaiting_collection', 'collected', 'disputed', 'reversed', 'cancelled')
    ),
    collected_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    confirming_actor_role TEXT CHECK (confirming_actor_role IN ('assistant', 'admin', 'system')),
    dispute_reason TEXT,
    reimbursement_status TEXT NOT NULL DEFAULT 'not_applicable' CHECK (
        reimbursement_status IN ('not_applicable', 'pending', 'approved', 'reimbursed', 'rejected')
    ),
    reimbursement_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    reimbursement_amount_paise BIGINT NOT NULL DEFAULT 0,
    reimbursement_notes TEXT,
    reimbursed_at TIMESTAMPTZ,
    reimbursed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Cash Collections
CREATE INDEX IF NOT EXISTS idx_cash_collections_booking_id 
ON public.cash_collections(booking_id);

CREATE INDEX IF NOT EXISTS idx_cash_collections_assistant_id 
ON public.cash_collections(assistant_id);

CREATE INDEX IF NOT EXISTS idx_cash_collections_passenger_id 
ON public.cash_collections(passenger_id);

CREATE INDEX IF NOT EXISTS idx_cash_collections_status 
ON public.cash_collections(status);

CREATE INDEX IF NOT EXISTS idx_cash_collections_reimbursement 
ON public.cash_collections(reimbursement_status);

CREATE INDEX IF NOT EXISTS idx_cash_collections_created_at 
ON public.cash_collections(created_at DESC);

-- Unique constraint: A single booking has at most one primary cash collection ledger
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_cash_collections_booking_id'
    ) THEN
        ALTER TABLE public.cash_collections 
        ADD CONSTRAINT uq_cash_collections_booking_id UNIQUE (booking_id);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.cash_collections ENABLE ROW LEVEL SECURITY;

-- Service Role Full Access
DROP POLICY IF EXISTS "Service role full access on cash_collections" ON public.cash_collections;
CREATE POLICY "Service role full access on cash_collections" 
ON public.cash_collections 
FOR ALL TO service_role 
USING (true) WITH CHECK (true);

-- Passengers can view their own cash collection receipts
DROP POLICY IF EXISTS "Passengers can view own cash_collections" ON public.cash_collections;
CREATE POLICY "Passengers can view own cash_collections" 
ON public.cash_collections 
FOR SELECT 
USING (auth.uid() = passenger_id);

-- Assistants can view cash collections for bookings assigned to them
DROP POLICY IF EXISTS "Assistants can view assigned cash_collections" ON public.cash_collections;
CREATE POLICY "Assistants can view assigned cash_collections" 
ON public.cash_collections 
FOR SELECT 
USING (auth.uid() = assistant_id);

-- -----------------------------------------------------------------------------
-- 4. HISTORICAL DATA BACKFILL (SAFE & IDEMPOTENT)
-- -----------------------------------------------------------------------------

-- 4.1 Backfill collection_status on bookings
UPDATE public.bookings
SET collection_status = CASE
    WHEN LOWER(COALESCE(payment_method, '')) IN ('cash', 'cod', 'pay_on_arrival') AND booking_status = 'completed' THEN 'collected'
    WHEN LOWER(COALESCE(payment_method, '')) IN ('cash', 'cod', 'pay_on_arrival') AND booking_status = 'cancelled' THEN 'cancelled'
    WHEN LOWER(COALESCE(payment_method, '')) IN ('cash', 'cod', 'pay_on_arrival') THEN 'awaiting_collection'
    ELSE 'not_applicable'
END
WHERE collection_status IS NULL OR collection_status = 'not_applicable';

-- 4.2 Seed cash_collections records for completed historical cash bookings
INSERT INTO public.cash_collections (
    booking_id,
    passenger_id,
    assistant_id,
    expected_amount,
    expected_amount_paise,
    collected_amount,
    collected_amount_paise,
    status,
    collected_at,
    confirming_actor_role,
    created_at,
    updated_at
)
SELECT 
    b.id,
    b.passenger_id,
    b.assistant_id,
    COALESCE(b.total_price, 0.00),
    ROUND(COALESCE(b.total_price, 0.00) * 100)::BIGINT,
    CASE WHEN b.booking_status = 'completed' THEN COALESCE(b.total_price, 0.00) ELSE 0.00 END,
    CASE WHEN b.booking_status = 'completed' THEN ROUND(COALESCE(b.total_price, 0.00) * 100)::BIGINT ELSE 0 END,
    CASE 
        WHEN b.booking_status = 'completed' THEN 'collected'
        WHEN b.booking_status = 'cancelled' THEN 'cancelled'
        ELSE 'awaiting_collection'
    END,
    CASE WHEN b.booking_status = 'completed' THEN b.completed_at ELSE NULL END,
    CASE WHEN b.booking_status = 'completed' THEN 'assistant' ELSE NULL END,
    b.created_at,
    b.updated_at
FROM public.bookings b
WHERE LOWER(COALESCE(b.payment_method, '')) IN ('cash', 'cod', 'pay_on_arrival')
ON CONFLICT (booking_id) DO NOTHING;

-- 4.3 Update payments channel
UPDATE public.payments
SET channel = 'online'
WHERE payment_gateway = 'razorpay' OR gateway_order_id IS NOT NULL;
