-- =============================================================================
-- V17 — Alignement de type et index evaluation_formateur (audit DSI F21)
-- enseignant_id : VARCHAR(255) -> VARCHAR(10), aligné sur formation.enseignants.id
-- (les identifiants canoniques sont au format ENS### / FORM###).
-- Index de performance sur les deux colonnes de référence.
-- NOTE : FK stricte volontairement non posée — isolation par schéma DSI §3.4 :
-- les références inter-services sont garanties par contrat d'API (Feign), comme
-- pour tous les autres services du monorepo.
-- =============================================================================

ALTER TABLE evaluation_formateur ALTER COLUMN enseignant_id TYPE VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_evaluation_formateur_enseignant ON evaluation_formateur (enseignant_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_formateur_formation  ON evaluation_formateur (formation_id);
