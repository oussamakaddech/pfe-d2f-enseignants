-- Colonnes manquantes détectées par Hibernate schema-validation (Inscription entity)
ALTER TABLE formation.inscriptions
    ADD COLUMN IF NOT EXISTS date_traitement TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS motif           VARCHAR(500);
