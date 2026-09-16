-- ──────────────────────────────────────────────────────────────────────────
-- Soft-delete + unicité : les contraintes UNIQUE pleines (users_email_key /
-- users_username_key) s'appliquaient à TOUTES les lignes, y compris les comptes
-- soft-deleted (deleted_at IS NOT NULL). Conséquence : un compte supprimé
-- conservait son email/username et bloquait toute recréation, alors même que
-- existsByEmail()/existsByUsername() (filtrés par @SQLRestriction deleted_at IS
-- NULL) ne le voyaient pas → 409 "duplicate key" inexplicable côté admin.
--
-- Correctif : remplacer ces contraintes par des INDEX UNIQUES PARTIELS qui
-- n'imposent l'unicité que sur les lignes vivantes (deleted_at IS NULL). Un
-- email/username redevient donc librement réutilisable après suppression, sans
-- avoir à obfusquer la ligne supprimée (l'audit trail reste intact).
-- ──────────────────────────────────────────────────────────────────────────

-- Postgres nomme les contraintes UNIQUE inline <table>_<column>_key.
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS users_username_key;

-- Index uniques partiels : unicité seulement parmi les comptes non supprimés.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_active
    ON auth.users (email)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_active
    ON auth.users (username)
    WHERE deleted_at IS NULL;
