-- =============================================================================
-- V11__Add_expires_at_to_confirmation_key.sql
-- Description: Add expires_at column to confirmation_key table for token
--              expiration (security hardening — 15 min TTL).
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'confirmation_key' AND column_name = 'expires_at'
    ) THEN
        -- 1) Add the column as nullable first
        ALTER TABLE confirmation_key ADD COLUMN expires_at TIMESTAMP;

        -- 2) Backfill any existing rows (mark them as already expired)
        UPDATE confirmation_key SET expires_at = NOW() WHERE expires_at IS NULL;

        -- 3) Set NOT NULL constraint
        ALTER TABLE confirmation_key ALTER COLUMN expires_at SET NOT NULL;
    END IF;
END $$;
