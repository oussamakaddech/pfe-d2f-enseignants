-- =============================================================================
-- V9__Create_confirmation_key_table.sql
-- Description: Create confirmation_key table if it doesn't exist and ensure
--              required columns are present.
-- =============================================================================

CREATE TABLE IF NOT EXISTS confirmation_key (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(255),
    email_address VARCHAR(255)
);

-- Ensure columns exist in case the table was created previously without them
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='confirmation_key' AND column_name='token') THEN
        ALTER TABLE confirmation_key ADD COLUMN token VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='confirmation_key' AND column_name='email_address') THEN
        ALTER TABLE confirmation_key ADD COLUMN email_address VARCHAR(255);
    END IF;
END $$;
