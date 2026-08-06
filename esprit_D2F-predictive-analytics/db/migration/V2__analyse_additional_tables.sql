-- =============================================================================
-- V2 Migration — predictive-analytics (schéma "analyse")
-- Tables créées hors Flyway historiquement (via SQLAlchemy create_all ou
-- scripts ad-hoc init_db/*.sql) et désormais couvertes par migration versionnée.
-- Idempotente : CREATE IF NOT EXISTS — compatible avec base déjà peuplée.
-- Audit DSI 08/2026 : clôture de l'écart "14 tables créées hors migration".
-- =============================================================================

-- training_paths : parcours de formation recommandé par (enseignant, compétence)
CREATE TABLE IF NOT EXISTS "analyse".training_paths (
    id                           BIGSERIAL PRIMARY KEY,
    enseignant_id                VARCHAR(36) NOT NULL,
    competence_id                BIGINT NOT NULL,
    competence_nom               VARCHAR(255) NOT NULL,
    niveau_depart                SMALLINT NOT NULL DEFAULT 0,
    niveau_vise                  SMALLINT NOT NULL DEFAULT 3,
    nb_formations                INTEGER NOT NULL DEFAULT 0,
    duree_totale_heures          INTEGER NOT NULL DEFAULT 0,
    probabilite_reussite_globale NUMERIC(5,4) NOT NULL DEFAULT 0,
    statut                       VARCHAR(20) NOT NULL DEFAULT 'ACTIF',
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_training_paths_enseignant ON "analyse".training_paths (enseignant_id);
CREATE INDEX IF NOT EXISTS ix_training_paths_competence ON "analyse".training_paths (competence_id);

-- training_path_items : étapes (formations) du parcours
CREATE TABLE IF NOT EXISTS "analyse".training_path_items (
    id                    BIGSERIAL PRIMARY KEY,
    training_path_id      BIGINT NOT NULL,
    formation_id          BIGINT NOT NULL,
    formation_titre       VARCHAR(255) NOT NULL,
    formation_type        VARCHAR(20),
    duree_heures          INTEGER NOT NULL DEFAULT 0,
    rang                  INTEGER NOT NULL,
    est_obligatoire       BOOLEAN NOT NULL DEFAULT TRUE,
    prerequis_competences JSONB,
    niveau_avant          SMALLINT NOT NULL DEFAULT 0,
    niveau_apres          SMALLINT NOT NULL DEFAULT 1,
    prerequis_satisfaits  BOOLEAN NOT NULL DEFAULT TRUE,
    deja_suivie           BOOLEAN NOT NULL DEFAULT FALSE,
    score_formation       NUMERIC(5,4) NOT NULL DEFAULT 0,
    justification         TEXT
);
CREATE INDEX IF NOT EXISTS ix_training_path_items_path ON "analyse".training_path_items (training_path_id);

-- teacher_risk_profiles : score de risque courant (source de vérité du dashboard)
CREATE TABLE IF NOT EXISTS "analyse".teacher_risk_profiles (
    id                         BIGSERIAL PRIMARY KEY,
    enseignant_id              VARCHAR(36) NOT NULL UNIQUE,
    score_risque               NUMERIC(5,4) NOT NULL DEFAULT 0,
    niveau_risque              VARCHAR(20) NOT NULL DEFAULT 'FAIBLE',
    nb_gaps_critiques          INTEGER NOT NULL DEFAULT 0,
    nb_gaps_moderes            INTEGER NOT NULL DEFAULT 0,
    nb_gaps_faibles            INTEGER NOT NULL DEFAULT 0,
    nb_mois_stagnation_max     INTEGER NOT NULL DEFAULT 0,
    tendance                   VARCHAR(20) NOT NULL DEFAULT 'STABLE',
    taux_completion_formations NUMERIC(5,2) NOT NULL DEFAULT 0,
    facteurs_risque            JSONB,
    recommandations_urgentes   JSONB,
    computed_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    precedent_score_risque     NUMERIC(5,4)
);
CREATE INDEX IF NOT EXISTS ix_risk_profiles_enseignant ON "analyse".teacher_risk_profiles (enseignant_id);

-- model_retraining_log : journal des ré-entraînements (rollback protection)
CREATE TABLE IF NOT EXISTS "analyse".model_retraining_log (
    id               BIGSERIAL PRIMARY KEY,
    model_name       VARCHAR(100) NOT NULL DEFAULT 'gap_predictor',
    model_version    VARCHAR(40),
    accuracy_before  NUMERIC(6,4),
    accuracy_after   NUMERIC(6,4),
    max_drop         NUMERIC(6,4),
    status           VARCHAR(20) NOT NULL DEFAULT 'success',  -- success|rollback|failed
    triggered_by     VARCHAR(64),
    dataset_size     INTEGER,
    trained_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    details_json     JSONB
);
