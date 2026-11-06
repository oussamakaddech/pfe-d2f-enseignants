-- V22 : aligner les colonnes de notes sur le type REAL attendu par les entités
-- JPA (float). Les migrations V19/V20/V21 avaient créé du NUMERIC, ce qui
-- fait échouer la validation Hibernate au démarrage sur toute base existante
-- ou vierge (Schema-validation: wrong column type ... expecting float4).
-- Conversion sans perte pour des notes décimales à 2 chiffres.

ALTER TABLE evaluation_formateur
    ALTER COLUMN maitrise_sujet TYPE REAL USING maitrise_sujet::REAL,
    ALTER COLUMN clarte TYPE REAL USING clarte::REAL,
    ALTER COLUMN pedagogie TYPE REAL USING pedagogie::REAL,
    ALTER COLUMN interaction TYPE REAL USING interaction::REAL,
    ALTER COLUMN gestion_temps TYPE REAL USING gestion_temps::REAL;

ALTER TABLE evaluation_globale
    ALTER COLUMN pertinence_contenu TYPE REAL USING pertinence_contenu::REAL,
    ALTER COLUMN organisation TYPE REAL USING organisation::REAL,
    ALTER COLUMN qualite_supports TYPE REAL USING qualite_supports::REAL,
    ALTER COLUMN duree_adaptee TYPE REAL USING duree_adaptee::REAL,
    ALTER COLUMN satisfaction_globale TYPE REAL USING satisfaction_globale::REAL;

ALTER TABLE learning_assessments
    ALTER COLUMN score TYPE REAL USING score::REAL,
    ALTER COLUMN max_score TYPE REAL USING max_score::REAL,
    ALTER COLUMN auto_evaluation TYPE REAL USING auto_evaluation::REAL,
    ALTER COLUMN practical_score TYPE REAL USING practical_score::REAL;
