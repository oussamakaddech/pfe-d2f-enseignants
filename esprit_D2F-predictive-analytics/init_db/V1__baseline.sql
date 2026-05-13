-- ============================================================
-- V1 — Baseline schema — esprit_D2F-predictive-analytics
-- ============================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version     VARCHAR(20) PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    applied_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- feature_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_snapshots (
    id                          BIGSERIAL PRIMARY KEY,
    enseignant_id               VARCHAR(36)  NOT NULL,
    snapshot_date               DATE         NOT NULL DEFAULT CURRENT_DATE,
    nb_savoirs_evalues          INTEGER      NOT NULL DEFAULT 0,
    nb_savoirs_niveau_1         INTEGER      NOT NULL DEFAULT 0,
    nb_savoirs_niveau_2         INTEGER      NOT NULL DEFAULT 0,
    nb_savoirs_niveau_3         INTEGER      NOT NULL DEFAULT 0,
    nb_savoirs_niveau_4         INTEGER      NOT NULL DEFAULT 0,
    nb_savoirs_niveau_5         INTEGER      NOT NULL DEFAULT 0,
    niveau_moyen_competences    NUMERIC(4,2) NOT NULL DEFAULT 0.0,
    nb_formations_inscrites     INTEGER      NOT NULL DEFAULT 0,
    nb_formations_approuvees    INTEGER      NOT NULL DEFAULT 0,
    nb_formations_completees    INTEGER      NOT NULL DEFAULT 0,
    taux_completion_formations  NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    taux_presence_moyen         NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    nb_besoins_exprimes         INTEGER      NOT NULL DEFAULT 0,
    nb_besoins_approuves        INTEGER      NOT NULL DEFAULT 0,
    priorite_besoin_max         VARCHAR(20),
    note_evaluation_moyenne     NUMERIC(4,2),
    nb_evaluations_soumises     INTEGER      NOT NULL DEFAULT 0,
    nb_certificats_obtenus      INTEGER      NOT NULL DEFAULT 0,
    computed_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_feature_snapshot UNIQUE (enseignant_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_feature_snapshots_enseignant ON feature_snapshots(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_feature_snapshots_date       ON feature_snapshots(snapshot_date DESC);

-- ============================================================
-- skill_gaps
-- ============================================================
CREATE TABLE IF NOT EXISTS skill_gaps (
    id                   BIGSERIAL PRIMARY KEY,
    enseignant_id        VARCHAR(36)  NOT NULL,
    competence_id        BIGINT       NOT NULL,
    competence_code      VARCHAR(50)  NOT NULL,
    competence_nom       VARCHAR(255) NOT NULL,
    domaine_id           BIGINT,
    domaine_nom          VARCHAR(255),
    niveau_actuel        SMALLINT     NOT NULL DEFAULT 0 CHECK (niveau_actuel BETWEEN 0 AND 5),
    niveau_requis        SMALLINT     NOT NULL DEFAULT 1 CHECK (niveau_requis  BETWEEN 1 AND 5),
    niveau_vise          SMALLINT     NOT NULL DEFAULT 3 CHECK (niveau_vise    BETWEEN 1 AND 5),
    gap_score            NUMERIC(5,4) NOT NULL DEFAULT 0.0 CHECK (gap_score    BETWEEN 0.0 AND 1.0),
    impact_score         NUMERIC(5,4) NOT NULL DEFAULT 0.0 CHECK (impact_score BETWEEN 0.0 AND 1.0),
    urgence_score        NUMERIC(5,4) NOT NULL DEFAULT 0.0 CHECK (urgence_score BETWEEN 0.0 AND 1.0),
    priorite_score       NUMERIC(5,4) NOT NULL DEFAULT 0.0 CHECK (priorite_score BETWEEN 0.0 AND 1.0),
    niveau_urgence       VARCHAR(20)  NOT NULL DEFAULT 'FAIBLE'
                         CHECK (niveau_urgence IN ('FAIBLE','MODEREE','HAUTE','CRITIQUE')),
    mois_stagnation      INTEGER      NOT NULL DEFAULT 0,
    en_regression        BOOLEAN      NOT NULL DEFAULT FALSE,
    nb_besoins_exprimes  INTEGER      NOT NULL DEFAULT 0,
    derniere_evaluation  DATE,
    justification        TEXT,
    prediction_result_id BIGINT,
    computed_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skill_gaps_enseignant  ON skill_gaps(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_skill_gaps_competence  ON skill_gaps(competence_id);
CREATE INDEX IF NOT EXISTS idx_skill_gaps_urgence     ON skill_gaps(niveau_urgence);
CREATE INDEX IF NOT EXISTS idx_skill_gaps_priorite    ON skill_gaps(priorite_score DESC);
CREATE INDEX IF NOT EXISTS idx_skill_gaps_computed    ON skill_gaps(computed_at DESC);

-- ============================================================
-- recommendations
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendations (
    id                   BIGSERIAL PRIMARY KEY,
    enseignant_id        VARCHAR(36)  NOT NULL,
    competence_id        BIGINT       NOT NULL,
    skill_gap_id         BIGINT,
    formation_id         BIGINT       NOT NULL,
    formation_titre      VARCHAR(255) NOT NULL,
    formation_type       VARCHAR(20),
    score_pertinence     NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    score_taux_reussite  NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    score_disponibilite  NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    score_global         NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    probabilite_reussite NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    rang_dans_parcours   INTEGER      NOT NULL DEFAULT 1,
    est_prerequis        BOOLEAN      NOT NULL DEFAULT FALSE,
    prerequis_satisfaits BOOLEAN      NOT NULL DEFAULT TRUE,
    niveau_apres         SMALLINT     CHECK (niveau_apres BETWEEN 1 AND 5),
    justification        TEXT,
    facteurs_score       JSONB,
    statut               VARCHAR(20)  NOT NULL DEFAULT 'PROPOSEE'
                         CHECK (statut IN ('PROPOSEE','ACCEPTEE','IGNOREE','OBSOLETE')),
    training_path_id     BIGINT,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_enseignant ON recommendations(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_competence ON recommendations(competence_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_formation  ON recommendations(formation_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_score      ON recommendations(score_global DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_statut     ON recommendations(statut);

-- ============================================================
-- training_paths
-- ============================================================
CREATE TABLE IF NOT EXISTS training_paths (
    id                           BIGSERIAL PRIMARY KEY,
    enseignant_id                VARCHAR(36)  NOT NULL,
    competence_id                BIGINT       NOT NULL,
    competence_nom               VARCHAR(255) NOT NULL,
    niveau_depart                SMALLINT     NOT NULL DEFAULT 0,
    niveau_vise                  SMALLINT     NOT NULL DEFAULT 3,
    nb_formations                INTEGER      NOT NULL DEFAULT 0,
    duree_totale_heures          INTEGER      NOT NULL DEFAULT 0,
    probabilite_reussite_globale NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    statut                       VARCHAR(20)  NOT NULL DEFAULT 'ACTIF'
                                 CHECK (statut IN ('ACTIF','COMPLETE','ARCHIVE','OBSOLETE')),
    created_at                   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_paths_enseignant ON training_paths(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_training_paths_competence ON training_paths(competence_id);

-- ============================================================
-- training_path_items
-- ============================================================
CREATE TABLE IF NOT EXISTS training_path_items (
    id                   BIGSERIAL PRIMARY KEY,
    training_path_id     BIGINT       NOT NULL REFERENCES training_paths(id) ON DELETE CASCADE,
    formation_id         BIGINT       NOT NULL,
    formation_titre      VARCHAR(255) NOT NULL,
    formation_type       VARCHAR(20),
    duree_heures         INTEGER      NOT NULL DEFAULT 0,
    rang                 INTEGER      NOT NULL,
    est_obligatoire      BOOLEAN      NOT NULL DEFAULT TRUE,
    prerequis_competences JSONB,
    niveau_avant         SMALLINT     NOT NULL DEFAULT 0,
    niveau_apres         SMALLINT     NOT NULL DEFAULT 1,
    prerequis_satisfaits BOOLEAN      NOT NULL DEFAULT TRUE,
    deja_suivie          BOOLEAN      NOT NULL DEFAULT FALSE,
    score_formation      NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    justification        TEXT
);

CREATE INDEX IF NOT EXISTS idx_path_items_path ON training_path_items(training_path_id);
CREATE INDEX IF NOT EXISTS idx_path_items_rang ON training_path_items(training_path_id, rang);

-- ============================================================
-- teacher_risk_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS teacher_risk_profiles (
    id                          BIGSERIAL PRIMARY KEY,
    enseignant_id               VARCHAR(36)  NOT NULL UNIQUE,
    score_risque                NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    niveau_risque               VARCHAR(20)  NOT NULL DEFAULT 'FAIBLE'
                                CHECK (niveau_risque IN ('FAIBLE','MODERE','ELEVE','CRITIQUE')),
    nb_gaps_critiques           INTEGER      NOT NULL DEFAULT 0,
    nb_gaps_moderes             INTEGER      NOT NULL DEFAULT 0,
    nb_gaps_faibles             INTEGER      NOT NULL DEFAULT 0,
    nb_mois_stagnation_max      INTEGER      NOT NULL DEFAULT 0,
    tendance                    VARCHAR(20)  NOT NULL DEFAULT 'STABLE'
                                CHECK (tendance IN ('PROGRESSION','STABLE','REGRESSION')),
    taux_completion_formations  NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    facteurs_risque             JSONB,
    recommandations_urgentes    JSONB,
    computed_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    precedent_score_risque      NUMERIC(5,4)
);

CREATE INDEX IF NOT EXISTS idx_risk_profiles_niveau   ON teacher_risk_profiles(niveau_risque);
CREATE INDEX IF NOT EXISTS idx_risk_profiles_score    ON teacher_risk_profiles(score_risque DESC);
CREATE INDEX IF NOT EXISTS idx_risk_profiles_computed ON teacher_risk_profiles(computed_at DESC);

-- ============================================================
-- prediction_results
-- ============================================================
CREATE TABLE IF NOT EXISTS prediction_results (
    id                       BIGSERIAL PRIMARY KEY,
    enseignant_id            VARCHAR(36)  NOT NULL,
    analyse_date             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nb_competences_analysees INTEGER      NOT NULL DEFAULT 0,
    nb_gaps_detectes         INTEGER      NOT NULL DEFAULT 0,
    nb_gaps_critiques        INTEGER      NOT NULL DEFAULT 0,
    nb_recommendations       INTEGER      NOT NULL DEFAULT 0,
    nb_alertes_generees      INTEGER      NOT NULL DEFAULT 0,
    score_global_competences NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    score_progression        NUMERIC(5,4) NOT NULL DEFAULT 0.0,
    statut                   VARCHAR(20)  NOT NULL DEFAULT 'EN_COURS'
                             CHECK (statut IN ('EN_COURS','TERMINE','ERREUR')),
    message_erreur           TEXT,
    duree_analyse_ms         INTEGER,
    details_json             JSONB
);

CREATE INDEX IF NOT EXISTS idx_prediction_results_enseignant ON prediction_results(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_date       ON prediction_results(analyse_date DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_results_statut     ON prediction_results(statut);

ALTER TABLE skill_gaps
    ADD CONSTRAINT IF NOT EXISTS fk_skill_gaps_prediction
    FOREIGN KEY (prediction_result_id) REFERENCES prediction_results(id)
    ON DELETE SET NULL;

-- ============================================================
-- alert_events
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_events (
    id                     BIGSERIAL PRIMARY KEY,
    type_alerte            VARCHAR(40)  NOT NULL
                           CHECK (type_alerte IN (
                               'GAP_CRITIQUE','STAGNATION','REGRESSION',
                               'TENDANCE_DEPARTEMENT','COMPLETION_FAIBLE','BESOIN_NON_COUVERT'
                           )),
    cible_type             VARCHAR(20)  NOT NULL DEFAULT 'INDIVIDUEL'
                           CHECK (cible_type IN ('INDIVIDUEL','COLLECTIF')),
    enseignant_id          VARCHAR(36),
    departement_id         VARCHAR(36),
    competence_id          BIGINT,
    skill_gap_id           BIGINT,
    severite               VARCHAR(20)  NOT NULL DEFAULT 'WARNING'
                           CHECK (severite IN ('INFO','WARNING','CRITICAL')),
    titre                  VARCHAR(255) NOT NULL,
    message                TEXT         NOT NULL,
    details_json           JSONB,
    statut                 VARCHAR(20)  NOT NULL DEFAULT 'NOUVELLE'
                           CHECK (statut IN ('NOUVELLE','LUE','TRAITEE','IGNOREE','ESCALADEE')),
    traite_par             VARCHAR(36),
    commentaire_traitement TEXT,
    created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_enseignant ON alert_events(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_dept       ON alert_events(departement_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type       ON alert_events(type_alerte);
CREATE INDEX IF NOT EXISTS idx_alerts_severite   ON alert_events(severite);
CREATE INDEX IF NOT EXISTS idx_alerts_statut     ON alert_events(statut);
CREATE INDEX IF NOT EXISTS idx_alerts_created    ON alert_events(created_at DESC);

-- ============================================================
-- dashboard_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS dashboard_snapshots (
    id            BIGSERIAL PRIMARY KEY,
    scope         VARCHAR(20)  NOT NULL DEFAULT 'GLOBAL'
                  CHECK (scope IN ('GLOBAL','DEPARTEMENT','UP')),
    scope_id      VARCHAR(36),
    snapshot_date DATE         NOT NULL DEFAULT CURRENT_DATE,
    kpis_json     JSONB        NOT NULL,
    computed_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_dashboard_snapshot UNIQUE (scope, scope_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_scope ON dashboard_snapshots(scope, snapshot_date DESC);

INSERT INTO schema_migrations (version, description)
VALUES ('V1', 'Baseline schema - predictive analytics')
ON CONFLICT (version) DO NOTHING;
