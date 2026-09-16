-- =============================================================================
-- V22 — Soft Delete pour besoin_formation (Fix 5)
-- =============================================================================
-- Ajoute la colonne deleted_at à la table besoin_formation.
-- NULL = enregistrement actif, non-NULL = supprimé logiquement.
--
-- L'entité BesoinFormation est annotée avec
--   @SQLRestriction("deleted_at IS NULL")
-- ce qui filtre automatiquement les lignes supprimées dans toutes les requêtes JPA.
--
-- La colonne est aussi indexée (voir V23) pour ne pas pénaliser les performances
-- sur les SELECT * FROM besoin_formation WHERE deleted_at IS NULL.
-- =============================================================================

ALTER TABLE besoin_formation
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Tous les enregistrements existants sont considérés comme actifs (deleted_at = NULL)
-- Aucune valeur par défaut nécessaire.

COMMENT ON COLUMN besoin_formation.deleted_at
    IS 'Horodatage UTC de la suppression logique. NULL = enregistrement actif.';
