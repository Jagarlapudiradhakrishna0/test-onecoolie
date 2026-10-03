-- ============================================================
-- ONECOOLIE — CANCELLATION & REBOOKING AUDIT LOGS MIGRATION
-- Run in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create cancellation_logs table for auditable records
CREATE TABLE IF NOT EXISTS cancellation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    passenger_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assistant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    previous_status TEXT,
    new_status TEXT DEFAULT 'cancelled',
    reason_category TEXT NOT NULL,
    reason_details TEXT,
    refund_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    refund_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cancellation_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role TEXT DEFAULT 'passenger',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cancellation_logs_booking_id ON cancellation_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_logs_passenger_id ON cancellation_logs(passenger_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_logs_created_at ON cancellation_logs(created_at DESC);

-- Enable RLS for cancellation_logs
ALTER TABLE cancellation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for service role on cancellation_logs" ON cancellation_logs
    FOR ALL USING (true) WITH CHECK (true);
