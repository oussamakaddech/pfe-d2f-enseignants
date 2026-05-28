-- DSI §4 — Soft delete : colonne deleted_at sur la table formations
-- Permet la suppression logique traçable (audit trail) sans perte de données.
ALTER TABLE formation.formations
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Index pour exclure les lignes supprimées des requêtes courantes
CREATE INDEX IF NOT EXISTS idx_formations_not_deleted
    ON formation.formations (deleted_at)
    WHERE deleted_at IS NULL;
