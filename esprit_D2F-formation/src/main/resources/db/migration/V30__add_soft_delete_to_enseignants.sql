-- =============================================================================
-- V30 : suppression logique (soft delete) des enseignants.
--       Un enseignant référencé (séances, présences, inscriptions) ne peut pas
--       être supprimé physiquement (violation FK → 409). On marque deleted_at
--       et on l'exclut des requêtes (cf. @SQLRestriction sur l'entité).
-- =============================================================================

ALTER TABLE enseignants
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- L'unicité de l'email ne doit s'appliquer qu'aux enseignants ACTIFS :
-- un email d'un enseignant supprimé peut être réutilisé.
DROP INDEX IF EXISTS ux_enseignants_mail;
CREATE UNIQUE INDEX IF NOT EXISTS ux_enseignants_mail
    ON enseignants (mail) WHERE deleted_at IS NULL;
