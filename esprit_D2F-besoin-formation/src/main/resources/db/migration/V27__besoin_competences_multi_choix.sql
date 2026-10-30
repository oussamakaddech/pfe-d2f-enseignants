-- =============================================================================
-- V27 — Choix multiple des compétences / sous-compétences / savoirs par besoin
-- Le formulaire de création permet désormais de sélectionner plusieurs
-- sous-compétences et plusieurs savoirs pour une même compétence (une ligne
-- de liaison par savoir). La contrainte V26 (besoin_id, competence_id)
-- interdisait ces combinaisons : elle est remplacée par une contrainte fine
-- (besoin_id, compétence, sous-compétence, savoir).
-- =============================================================================

-- 1. Relâcher la contrainte V26 (une seule ligne par compétence)
ALTER TABLE besoin.besoin_competences
    DROP CONSTRAINT IF EXISTS uq_besoin_competences_besoin_competence;

-- 2. Nom de la sous-compétence dénormalisé (parité competence_nom / savoir_nom)
ALTER TABLE besoin.besoin_competences
    ADD COLUMN IF NOT EXISTS sous_competence_nom VARCHAR(255);

-- 3. Déduplication fine (idempotent) — COALESCE pour traiter les NULL comme valeurs
CREATE UNIQUE INDEX IF NOT EXISTS uq_besoin_comp_besoin_comp_souscomp_savoir
    ON besoin.besoin_competences
        (besoin_id, competence_id,
         COALESCE(sous_competence_id, -1), COALESCE(savoir_id, -1));
