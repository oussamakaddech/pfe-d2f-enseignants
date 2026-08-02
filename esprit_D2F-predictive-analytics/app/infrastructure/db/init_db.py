from sqlalchemy import text
from sqlalchemy.engine import Engine

ANALYSE_DDL = [
    """
    CREATE TABLE IF NOT EXISTS "analyse".skill_gaps (
        id                BIGSERIAL PRIMARY KEY,
        enseignant_id     VARCHAR(36) NOT NULL,
        competence_id     BIGINT NOT NULL,
        competence_code   VARCHAR(50) NOT NULL,
        competence_nom    VARCHAR(255) NOT NULL,
        domaine_id        BIGINT,
        domaine_nom       VARCHAR(255),
        niveau_actuel     SMALLINT NOT NULL DEFAULT 0,
        niveau_requis     SMALLINT NOT NULL DEFAULT 1,
        niveau_vise       SMALLINT NOT NULL DEFAULT 3,
        gap_score         NUMERIC(5,4) NOT NULL DEFAULT 0,
        impact_score      NUMERIC(5,4) NOT NULL DEFAULT 0,
        urgence_score     NUMERIC(5,4) NOT NULL DEFAULT 0,
        priorite_score    NUMERIC(5,4) NOT NULL DEFAULT 0,
        niveau_urgence    VARCHAR(20) NOT NULL DEFAULT 'FAIBLE',
        mois_stagnation   INTEGER NOT NULL DEFAULT 0,
        en_regression     BOOLEAN NOT NULL DEFAULT FALSE,
        nb_besoins_exprimes INTEGER NOT NULL DEFAULT 0,
        derniere_evaluation DATE,
        justification     TEXT,
        prediction_result_id BIGINT,
        computed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS ix_skill_gaps_enseignant ON "analyse".skill_gaps (enseignant_id);
    CREATE INDEX IF NOT EXISTS ix_skill_gaps_competence ON "analyse".skill_gaps (competence_id);
    """,
    """
    CREATE TABLE IF NOT EXISTS "analyse".recommendations (
        id                 BIGSERIAL PRIMARY KEY,
        enseignant_id      VARCHAR(36) NOT NULL,
        competence_id      BIGINT NOT NULL,
        skill_gap_id       BIGINT,
        formation_id       BIGINT NOT NULL,
        formation_titre    VARCHAR(255) NOT NULL,
        formation_type     VARCHAR(20),
        score_pertinence   NUMERIC(5,4) NOT NULL DEFAULT 0,
        score_taux_reussite NUMERIC(5,4) NOT NULL DEFAULT 0,
        score_disponibilite NUMERIC(5,4) NOT NULL DEFAULT 0,
        score_global       NUMERIC(5,4) NOT NULL DEFAULT 0,
        statut             VARCHAR(20) NOT NULL DEFAULT 'SUGGESTED',
        raison             TEXT,
        model_version      VARCHAR(40),
        computed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS ix_recommendations_enseignant ON "analyse".recommendations (enseignant_id);
    """,
    """
    CREATE TABLE IF NOT EXISTS "analyse".teacher_risk_snapshots (
        id            BIGSERIAL PRIMARY KEY,
        enseignant_id VARCHAR(36) NOT NULL,
        snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
        score_risque  NUMERIC(5,4) NOT NULL DEFAULT 0,
        niveau_risque VARCHAR(20) NOT NULL DEFAULT 'FAIBLE',
        tendance      VARCHAR(20) NOT NULL DEFAULT 'STABLE',
        details_json  JSONB,
        computed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS ix_risk_snap_enseignant ON "analyse".teacher_risk_snapshots (enseignant_id, snapshot_date DESC);
    """,
    """
    CREATE TABLE IF NOT EXISTS "analyse".prediction_results (
        id                       BIGSERIAL PRIMARY KEY,
        enseignant_id            VARCHAR(36) NOT NULL,
        analyse_date             TIMESTAMPTZ NOT NULL DEFAULT now(),
        nb_competences_analysees INTEGER NOT NULL DEFAULT 0,
        nb_gaps_detectes         INTEGER NOT NULL DEFAULT 0,
        nb_gaps_critiques        INTEGER NOT NULL DEFAULT 0,
        nb_recommendations       INTEGER NOT NULL DEFAULT 0,
        nb_alertes_generees      INTEGER NOT NULL DEFAULT 0,
        score_global_competences NUMERIC(5,4) NOT NULL DEFAULT 0,
        score_progression        NUMERIC(5,4) NOT NULL DEFAULT 0,
        statut                   VARCHAR(20) NOT NULL DEFAULT 'EN_COURS',
        message_erreur           TEXT,
        duree_analyse_ms         INTEGER,
        details_json             JSONB
    );
    CREATE INDEX IF NOT EXISTS ix_pred_results_enseignant ON "analyse".prediction_results (enseignant_id, analyse_date DESC);
    """,
    """
    CREATE TABLE IF NOT EXISTS "analyse".alert_events (
        id                     BIGSERIAL PRIMARY KEY,
        type_alerte            VARCHAR(40) NOT NULL,
        cible_type             VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUEL',
        enseignant_id          VARCHAR(36),
        departement_id         VARCHAR(36),
        competence_id          BIGINT,
        skill_gap_id           BIGINT,
        severite               VARCHAR(20) NOT NULL DEFAULT 'WARNING',
        titre                  VARCHAR(255) NOT NULL,
        message                TEXT NOT NULL,
        details_json           JSONB,
        statut                 VARCHAR(20) NOT NULL DEFAULT 'NOUVELLE',
        traite_par             VARCHAR(36),
        commentaire_traitement TEXT,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS ix_alert_events_enseignant ON "analyse".alert_events (enseignant_id);
    CREATE INDEX IF NOT EXISTS ix_alert_events_statut ON "analyse".alert_events (statut);
    CREATE INDEX IF NOT EXISTS ix_alert_events_created ON "analyse".alert_events (created_at DESC);
    """,
    """
    CREATE TABLE IF NOT EXISTS "analyse".training_needs (
        id              BIGSERIAL PRIMARY KEY,
        type_besoin     VARCHAR(20) NOT NULL,
        competence_id   BIGINT NOT NULL,
        competence_code VARCHAR(50) NOT NULL,
        nom             VARCHAR(255) NOT NULL,
        scope_type      VARCHAR(20),
        scope_id        VARCHAR(36),
        nb_enseignants  INTEGER NOT NULL DEFAULT 0,
        evidence_json   JSONB,
        statut          VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        detected_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS ix_training_needs_competence ON "analyse".training_needs (competence_id);
    CREATE INDEX IF NOT EXISTS ix_training_needs_statut ON "analyse".training_needs (statut);
    """,
    """
    CREATE TABLE IF NOT EXISTS "analyse".dashboard_snapshots (
        id            BIGSERIAL PRIMARY KEY,
        scope         VARCHAR(20) NOT NULL DEFAULT 'GLOBAL',
        scope_id      VARCHAR(36),
        snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
        kpis_json     JSONB NOT NULL,
        computed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS ix_dashboard_snapshots_scope ON "analyse".dashboard_snapshots (scope, scope_id, snapshot_date DESC);
    """,
    """
    CREATE TABLE IF NOT EXISTS "analyse".teacher_competence_coverage (
        id             BIGSERIAL PRIMARY KEY,
        enseignant_id  VARCHAR(64) NOT NULL,
        competence_id  BIGINT NOT NULL,
        departement_id VARCHAR(64),
        current_level  SMALLINT NOT NULL DEFAULT 0,
        required_level SMALLINT NOT NULL DEFAULT 0,
        covered        BOOLEAN NOT NULL DEFAULT FALSE,
        snapshot_date  DATE NOT NULL DEFAULT CURRENT_DATE
    );
    CREATE INDEX IF NOT EXISTS ix_coverage_enseignant ON "analyse".teacher_competence_coverage (enseignant_id);
    """,
    """
    CREATE TABLE IF NOT EXISTS "analyse".feature_snapshots (
        id             BIGSERIAL PRIMARY KEY,
        teacher_id     VARCHAR(36) NOT NULL,
        feature_set    VARCHAR(50) NOT NULL,
        as_of          DATE NOT NULL DEFAULT CURRENT_DATE,
        payload        JSONB NOT NULL,
        computed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS ix_feature_snapshots_teacher ON "analyse".feature_snapshots (teacher_id, as_of DESC);
    """,
    """
    CREATE TABLE IF NOT EXISTS "analyse".event_processing (
        id             BIGSERIAL PRIMARY KEY,
        event_id       VARCHAR(64) NOT NULL UNIQUE,
        event_type     VARCHAR(64),
        processed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    """,
]


def init_analyse_schema(engine: Engine) -> None:
    with engine.begin() as connection:
        for ddl in ANALYSE_DDL:
            connection.execute(text(ddl))
