-- =============================================================================
-- V1 Baseline Migration — besoinsformation-service
-- Schéma initial tel que créé par spring.jpa.hibernate.ddl-auto=update.
-- Colonnes/tables ajoutées par migrations ultérieures :
--   V2  : titre, horaire_souhaite
--   V3  : priorite, impact_strategique
--   V4  : est_ouverte, autres_informations
--   V9  : periode_formation (supprimée en V10)
--   V10 : period_code, custom_period_label
--   V11 : event_published
--   V12 : correction typos id_besion/approuvecup (IF EXISTS — idempotent)
--   V14 : last_refresh_date
--   V15 : table notification
-- Conformité DSI §3.2
-- =============================================================================

CREATE TABLE IF NOT EXISTS besoin_formation (
    id_besoin_formation      BIGSERIAL    PRIMARY KEY,
    username                 VARCHAR(255),
    type_besoin              VARCHAR(255),
    objectif_formation       TEXT,
    proposition_animateur    TEXT,
    prerequis                TEXT,
    public_cible             VARCHAR(255),
    nb_max_participants      INTEGER,
    programme_formation      TEXT,
    duree_formation          INTEGER,
    theme                    VARCHAR(255),
    objectifs_operationnels  TEXT,
    objectifs_pedagogiques   TEXT,
    methodes_pedagogiques    TEXT,
    moyens_pedagogiques      TEXT,
    methodes_evaluation_acquis TEXT,
    profil_formateur         VARCHAR(255),
    up                       VARCHAR(255),
    departement              VARCHAR(255),
    approuve_cup             BOOLEAN,
    approuve_chef_dep        BOOLEAN,
    approuve_admin           BOOLEAN,
    notification_message     VARCHAR(255)
);
