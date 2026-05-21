-- DSI §4 — Soft delete : colonne deleted_at sur la table users
-- Suppression logique obligatoire pour préserver l'audit trail des comptes.
ALTER TABLE auth.users
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Index pour exclure les utilisateurs supprimés des requêtes courantes
CREATE INDEX IF NOT EXISTS idx_users_not_deleted
    ON auth.users (deleted_at)
    WHERE deleted_at IS NULL;
