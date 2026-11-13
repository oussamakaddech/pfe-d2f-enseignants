-- Étape 3 : structurer l'évaluation de la formation et du formateur
-- en critères distincts (3 objets : formation / formateur / apprentissage).

-- Évaluation de la formation : pertinence, organisation, supports, durée, satisfaction.
ALTER TABLE evaluation_globale
    ADD COLUMN IF NOT EXISTS pertinence_contenu NUMERIC(4,2),
    ADD COLUMN IF NOT EXISTS organisation NUMERIC(4,2),
    ADD COLUMN IF NOT EXISTS qualite_supports NUMERIC(4,2),
    ADD COLUMN IF NOT EXISTS duree_adaptee NUMERIC(4,2),
    ADD COLUMN IF NOT EXISTS satisfaction_globale NUMERIC(4,2);

-- Évaluation du formateur : maîtrise, clarté, pédagogie, interaction, gestion du temps.
ALTER TABLE evaluation_formateur
    ADD COLUMN IF NOT EXISTS maitrise_sujet NUMERIC(4,2),
    ADD COLUMN IF NOT EXISTS clarte NUMERIC(4,2),
    ADD COLUMN IF NOT EXISTS pedagogie NUMERIC(4,2),
    ADD COLUMN IF NOT EXISTS interaction NUMERIC(4,2),
    ADD COLUMN IF NOT EXISTS gestion_temps NUMERIC(4,2);