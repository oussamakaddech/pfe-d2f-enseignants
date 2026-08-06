-- =============================================================================
-- V26 — Contrainte unique (besoin_id, competence_id) sur besoin_competences
-- Audit DSI (F21) : la table de liaison acceptait des doublons
-- (même compétence rattachée plusieurs fois au même besoin).
-- Déduplication préalable, puis contrainte unique idempotente.
-- =============================================================================

-- 1. Supprimer les doublons (conserver le plus petit id)
DELETE FROM besoin.besoin_competences a
USING besoin.besoin_competences b
WHERE a.id > b.id
  AND a.besoin_id = b.besoin_id
  AND a.competence_id = b.competence_id;

-- 2. Contrainte unique (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_besoin_competences_besoin_competence'
    ) THEN
        ALTER TABLE besoin.besoin_competences
            ADD CONSTRAINT uq_besoin_competences_besoin_competence
            UNIQUE (besoin_id, competence_id);
    END IF;
END $$;
