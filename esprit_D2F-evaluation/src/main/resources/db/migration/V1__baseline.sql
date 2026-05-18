-- =============================================================================
-- V1 Baseline Migration — evaluation-service
-- Schéma initial tel que créé par spring.jpa.hibernate.ddl-auto=update.
-- Tables/colonnes ajoutées par migrations ultérieures :
--   V2 : table evaluation_formateur
--   V4 : contrainte chk_formation_id sur evaluation_formateur
--   V13 : evaluation_globale.last_refresh_date
-- Conformité DSI §3.2
-- =============================================================================

CREATE TABLE IF NOT EXISTS evaluation_globale (
    id_eval_globale     BIGSERIAL     PRIMARY KEY,
    formation_id        BIGINT        NOT NULL UNIQUE,
    commentaire_general VARCHAR(3000),
    date_evaluation     DATE,
    note_globale        REAL,
    recommandation      VARCHAR(100)
);
