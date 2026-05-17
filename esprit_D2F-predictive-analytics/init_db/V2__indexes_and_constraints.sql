-- ============================================================
-- V2 — Index composites et contraintes supplémentaires
-- ============================================================

-- pg_trgm extension for similarity search (used by BESOIN_DEMAND_QUERY_PGTRGM)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index on competences.nom for fast similarity search
CREATE INDEX IF NOT EXISTS idx_competences_nom_trgm
    ON competences USING GIN (nom gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_skill_gaps_ens_urgence
    ON skill_gaps(enseignant_id, niveau_urgence, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_skill_gaps_ens_comp_date
    ON skill_gaps(enseignant_id, competence_id, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendations_ens_comp
    ON recommendations(enseignant_id, competence_id, score_global DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_statut_severite
    ON alert_events(statut, severite, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_facteurs_gin
    ON teacher_risk_profiles USING GIN (facteurs_risque);

CREATE INDEX IF NOT EXISTS idx_path_items_prerequis_gin
    ON training_path_items USING GIN (prerequis_competences);

CREATE INDEX IF NOT EXISTS idx_alerts_details_gin
    ON alert_events USING GIN (details_json);

INSERT INTO schema_migrations (version, description)
VALUES ('V2', 'Composite indexes and JSONB GIN indexes')
ON CONFLICT (version) DO NOTHING;
