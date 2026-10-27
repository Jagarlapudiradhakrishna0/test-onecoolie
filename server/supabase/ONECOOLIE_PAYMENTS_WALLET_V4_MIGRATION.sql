-- ==============================================================================
-- ONECOOLIE — PRODUCTION RAZORPAY PAYMENTS & ASSISTANT WALLET MIGRATION (V4.0)
-- System: Supabase / PostgreSQL 15+
--
-- Additive, idempotent, non-destructive migration script.
-- Establishes:
--  1. Integer paise columns for exact financial calculations
--  2. Assistant Wallets table with non-negative balance constraint
--  3. Wallet Top-Up Intents table for Razorpay Checkout tracking
--  4. Immutable Wallet Transactions ledger with balance before/after invariants
--  5. Immutability enforcement trigger on wallet ledger
--  6. High-performance indexes for lookups
--  7. Strict Row Level Security (RLS) policies
-- ==============================================================================

-- 1. ADD INTEGER PAISE COLUMNS TO EXISTING PAYMENTS & REFUNDS
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount_paise BIGINT;
ALTER TABLE public.refunds ADD COLUMN IF NOT EXISTS amount_paise BIGINT;

-- Backfill amount_paise from numeric amount for existing records if null
UPDATE public.payments
SET amount_paise = ROUND(amount * 100)
WHERE amount_paise IS NULL AND amount IS NOT NULL;

UPDATE public.refunds
SET amount_paise = ROUND(amount * 100)
WHERE amount_paise IS NULL AND amount IS NOT NULL;

-- 2. ASSISTANT WALLETS TABLE
-- Stores authoritative available balance in integer paise for each assistant.
CREATE TABLE IF NOT EXISTS public.assistant_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    balance_paise BIGINT NOT NULL DEFAULT 0 CHECK (balance_paise >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'locked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assistant_wallets ADD COLUMN IF NOT EXISTS assistant_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.assistant_wallets ADD COLUMN IF NOT EXISTS balance_paise BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.assistant_wallets ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE public.assistant_wallets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.assistant_wallets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.assistant_wallets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. WALLET TOP-UP INTENTS TABLE
-- Tracks Razorpay checkout top-up attempts and authorizations.
CREATE TABLE IF NOT EXISTS public.wallet_topup_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount_paise BIGINT NOT NULL CHECK (amount_paise >= 10000 AND amount_paise <= 5000000), -- ₹100 min, ₹50,000 max
    currency TEXT NOT NULL DEFAULT 'INR',
    gateway TEXT NOT NULL DEFAULT 'razorpay',
    gateway_order_id TEXT UNIQUE,
    gateway_payment_id TEXT,
    gateway_signature TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('created', 'pending', 'processing', 'completed', 'failed', 'cancelled')),
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wallet_topup_intents ADD COLUMN IF NOT EXISTS assistant_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.wallet_topup_intents ADD COLUMN IF NOT EXISTS amount_paise BIGINT NOT NULL DEFAULT 10000;
ALTER TABLE public.wallet_topup_intents ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE public.wallet_topup_intents ADD COLUMN IF NOT EXISTS gateway TEXT NOT NULL DEFAULT 'razorpay';
ALTER TABLE public.wallet_topup_intents ADD COLUMN IF NOT EXISTS gateway_order_id TEXT;
ALTER TABLE public.wallet_topup_intents ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;
ALTER TABLE public.wallet_topup_intents ADD COLUMN IF NOT EXISTS gateway_signature TEXT;
ALTER TABLE public.wallet_topup_intents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.wallet_topup_intents ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE public.wallet_topup_intents ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.wallet_topup_intents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.wallet_topup_intents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. WALLET TRANSACTIONS TABLE (IMMUTABLE AUDITABLE LEDGER)
-- Every balance movement has an immutable ledger entry with balance before and after.
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.assistant_wallets(id) ON DELETE CASCADE,
    assistant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    transaction_reference TEXT UNIQUE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (
        transaction_type IN ('topup', 'earning_credit', 'payout_debit', 'payout_hold', 'payout_release', 'adjustment', 'refund')
    ),
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
    balance_before_paise BIGINT NOT NULL CHECK (balance_before_paise >= 0),
    balance_after_paise BIGINT NOT NULL CHECK (balance_after_paise >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    gateway_payment_id TEXT,
    related_topup_id UUID REFERENCES public.wallet_topup_intents(id) ON DELETE SET NULL,
    related_earning_id UUID REFERENCES public.assistant_earnings(id) ON DELETE SET NULL,
    related_payout_id UUID REFERENCES public.assistant_payouts(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES public.assistant_wallets(id) ON DELETE CASCADE;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS assistant_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS transaction_reference TEXT;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS transaction_type TEXT;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS amount_paise BIGINT;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS direction TEXT;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS balance_before_paise BIGINT;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS balance_after_paise BIGINT;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS related_topup_id UUID REFERENCES public.wallet_topup_intents(id) ON DELETE SET NULL;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS related_earning_id UUID REFERENCES public.assistant_earnings(id) ON DELETE SET NULL;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS related_payout_id UUID REFERENCES public.assistant_payouts(id) ON DELETE SET NULL;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5. IMMUTABILITY TRIGGER FOR WALLET TRANSACTIONS
CREATE OR REPLACE FUNCTION public.prevent_wallet_transactions_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security Policy Violation: wallet_transactions is an immutable append-only ledger. UPDATE and DELETE operations are strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_wallet_transactions_mutation ON public.wallet_transactions;
CREATE TRIGGER trg_prevent_wallet_transactions_mutation
BEFORE UPDATE OR DELETE ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.prevent_wallet_transactions_mutation();

-- 6. UPDATED_AT TRIGGERS
DROP TRIGGER IF EXISTS set_timestamp_assistant_wallets ON public.assistant_wallets;
CREATE TRIGGER set_timestamp_assistant_wallets
BEFORE UPDATE ON public.assistant_wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_wallet_topup_intents ON public.wallet_topup_intents;
CREATE TRIGGER set_timestamp_wallet_topup_intents
BEFORE UPDATE ON public.wallet_topup_intents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_assistant_wallets_assistant_id ON public.assistant_wallets(assistant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_wallets_status ON public.assistant_wallets(status);

CREATE INDEX IF NOT EXISTS idx_wallet_topup_assistant ON public.wallet_topup_intents(assistant_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topup_order_id ON public.wallet_topup_intents(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topup_payment_id ON public.wallet_topup_intents(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topup_status ON public.wallet_topup_intents(status);
CREATE INDEX IF NOT EXISTS idx_wallet_topup_created_at ON public.wallet_topup_intents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_txns_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_assistant_id ON public.wallet_transactions(assistant_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_reference ON public.wallet_transactions(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_type ON public.wallet_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_created_at ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_txns_payment_id ON public.wallet_transactions(gateway_payment_id);

CREATE INDEX IF NOT EXISTS idx_payments_amount_paise ON public.payments(amount_paise);
CREATE INDEX IF NOT EXISTS idx_refunds_amount_paise ON public.refunds(amount_paise);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.assistant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_topup_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 8.1 SERVICE ROLE FULL ACCESS (Backend Authoritative Ledger Operations)
DROP POLICY IF EXISTS "Service role full access on assistant_wallets" ON public.assistant_wallets;
CREATE POLICY "Service role full access on assistant_wallets" ON public.assistant_wallets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on wallet_topup_intents" ON public.wallet_topup_intents;
CREATE POLICY "Service role full access on wallet_topup_intents" ON public.wallet_topup_intents
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on wallet_transactions" ON public.wallet_transactions;
CREATE POLICY "Service role full access on wallet_transactions" ON public.wallet_transactions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8.2 ASSISTANT READ-OWN ISOLATION
DROP POLICY IF EXISTS "Assistants can view own wallet" ON public.assistant_wallets;
CREATE POLICY "Assistants can view own wallet" ON public.assistant_wallets
    FOR SELECT TO authenticated USING (auth.uid() = assistant_id);

DROP POLICY IF EXISTS "Assistants can view own topup intents" ON public.wallet_topup_intents;
CREATE POLICY "Assistants can view own topup intents" ON public.wallet_topup_intents
    FOR SELECT TO authenticated USING (auth.uid() = assistant_id);

DROP POLICY IF EXISTS "Assistants can view own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Assistants can view own wallet transactions" ON public.wallet_transactions
    FOR SELECT TO authenticated USING (auth.uid() = assistant_id);

-- 8.3 ADMIN GOVERNANCE ACCESS
DROP POLICY IF EXISTS "Admins have full access to assistant_wallets" ON public.assistant_wallets;
CREATE POLICY "Admins have full access to assistant_wallets" ON public.assistant_wallets
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

DROP POLICY IF EXISTS "Admins have full access to wallet_topup_intents" ON public.wallet_topup_intents;
CREATE POLICY "Admins have full access to wallet_topup_intents" ON public.wallet_topup_intents
    FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all wallet transactions" ON public.wallet_transactions
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
    );

-- 8.4 GRANTS
GRANT ALL ON public.assistant_wallets TO service_role;
GRANT ALL ON public.wallet_topup_intents TO service_role;
GRANT ALL ON public.wallet_transactions TO service_role;

GRANT SELECT ON public.assistant_wallets TO authenticated;
GRANT SELECT ON public.wallet_topup_intents TO authenticated;
GRANT SELECT ON public.wallet_transactions TO authenticated;

REVOKE ALL ON public.assistant_wallets FROM anon;
REVOKE ALL ON public.wallet_topup_intents FROM anon;
REVOKE ALL ON public.wallet_transactions FROM anon;
