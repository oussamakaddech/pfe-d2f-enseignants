-- =============================================================================
-- V13 Add login lockout columns to users
-- =============================================================================
-- Ajoute les colonnes necessaires au verrouillage de compte apres N tentatives
-- echouees (anti brute-force / credential stuffing).
--
-- Conformite DSI §6 : limitation des tentatives de connexion.
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'failed_login_attempts'
    ) THEN
        ALTER TABLE users
            ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'lock_until'
    ) THEN
        ALTER TABLE users
            ADD COLUMN lock_until TIMESTAMP;
    END IF;
END $$;

-- Index pour purger / monitorer rapidement les comptes verrouilles.
CREATE INDEX IF NOT EXISTS idx_users_lock_until ON users(lock_until)
    WHERE lock_until IS NOT NULL;
