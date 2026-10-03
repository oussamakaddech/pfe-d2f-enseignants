-- DSI — Évaluation globale : ajout de l'enseignant évalué (formateur / animateur
-- de la formation). Un utilisateur sélectionne quel enseignant il évalue.
ALTER TABLE evaluation.evaluation_globale
    ADD COLUMN IF NOT EXISTS enseignant_id VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_evaluation_globale_enseignant
    ON evaluation.evaluation_globale (enseignant_id);