-- =============================================================================
-- V1 Baseline Migration — competence-service
-- Schéma initial tel que créé par spring.jpa.hibernate.ddl-auto=update.
-- Colonnes/tables ajoutées par migrations ultérieures :
--   V2 : sous_competences.parent_id, sous_competences.niveau
--   V3 : table competence_prerequisite
--   V4 : competences.prerequisite_manual
--   V5 : savoirs.competence_id, sous_competence_id devient nullable
-- Conformité DSI §3.2
-- =============================================================================

CREATE TABLE IF NOT EXISTS domaines (
    id          BIGSERIAL    PRIMARY KEY,
    code        VARCHAR(255) NOT NULL UNIQUE,
    nom         VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    actif       BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMP    NOT NULL,
    updated_at  TIMESTAMP,
    created_by  VARCHAR(150) NOT NULL,
    updated_by  VARCHAR(150),
    version     BIGINT
);

CREATE TABLE IF NOT EXISTS competences (
    id          BIGSERIAL    PRIMARY KEY,
    code        VARCHAR(255) NOT NULL UNIQUE,
    nom         VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    ordre       INTEGER,
    domaine_id  BIGINT       NOT NULL REFERENCES domaines(id),
    created_at  TIMESTAMP    NOT NULL,
    updated_at  TIMESTAMP,
    created_by  VARCHAR(150) NOT NULL,
    updated_by  VARCHAR(150),
    version     BIGINT
);

CREATE TABLE IF NOT EXISTS sous_competences (
    id            BIGSERIAL    PRIMARY KEY,
    code          VARCHAR(255) NOT NULL UNIQUE,
    nom           VARCHAR(255) NOT NULL,
    description   VARCHAR(255),
    competence_id BIGINT       NOT NULL REFERENCES competences(id),
    created_at    TIMESTAMP    NOT NULL,
    updated_at    TIMESTAMP,
    created_by    VARCHAR(150) NOT NULL,
    updated_by    VARCHAR(150),
    version       BIGINT
);

CREATE TABLE IF NOT EXISTS savoirs (
    id                 BIGSERIAL    PRIMARY KEY,
    code               VARCHAR(255) NOT NULL UNIQUE,
    nom                VARCHAR(255) NOT NULL,
    description        VARCHAR(255),
    type               VARCHAR(255) NOT NULL,
    niveau             VARCHAR(255) NOT NULL DEFAULT 'N2_ELEMENTAIRE',
    sous_competence_id BIGINT       NOT NULL REFERENCES sous_competences(id),
    created_at         TIMESTAMP    NOT NULL,
    updated_at         TIMESTAMP,
    created_by         VARCHAR(150) NOT NULL,
    updated_by         VARCHAR(150),
    version            BIGINT
);

CREATE TABLE IF NOT EXISTS enseignant_competences (
    id               BIGSERIAL    PRIMARY KEY,
    enseignant_id    VARCHAR(255) NOT NULL,
    savoir_id        BIGINT       NOT NULL REFERENCES savoirs(id),
    niveau           VARCHAR(255) NOT NULL,
    date_acquisition DATE         DEFAULT CURRENT_DATE,
    commentaire      VARCHAR(255),
    created_at       TIMESTAMP    NOT NULL,
    updated_at       TIMESTAMP,
    created_by       VARCHAR(150) NOT NULL,
    updated_by       VARCHAR(150),
    version          BIGINT,
    CONSTRAINT uq_enseignant_savoir UNIQUE (enseignant_id, savoir_id)
);

CREATE TABLE IF NOT EXISTS niveau_savoir_requis (
    id                 BIGSERIAL    PRIMARY KEY,
    competence_id      BIGINT       REFERENCES competences(id),
    sous_competence_id BIGINT       REFERENCES sous_competences(id),
    niveau             VARCHAR(255) NOT NULL,
    savoir_id          BIGINT       NOT NULL REFERENCES savoirs(id),
    description        VARCHAR(255),
    created_at         TIMESTAMP    NOT NULL,
    updated_at         TIMESTAMP,
    created_by         VARCHAR(150) NOT NULL,
    updated_by         VARCHAR(150),
    version            BIGINT
);

CREATE TABLE IF NOT EXISTS rice_import_logs (
    id                       BIGSERIAL    PRIMARY KEY,
    generated_at             TIMESTAMP    NOT NULL,
    domaines_created         INTEGER,
    competences_created      INTEGER,
    sous_competences_created INTEGER,
    savoirs_created          INTEGER,
    affectations_created     INTEGER,
    enseignants_covered      INTEGER,
    message                  TEXT,
    taux_json                TEXT,
    created_at               TIMESTAMP    NOT NULL,
    updated_at               TIMESTAMP,
    created_by               VARCHAR(150) NOT NULL,
    updated_by               VARCHAR(150),
    version                  BIGINT
);

CREATE INDEX IF NOT EXISTS idx_domaine_code           ON domaines(code);
CREATE INDEX IF NOT EXISTS idx_competence_code        ON competences(code);
CREATE INDEX IF NOT EXISTS idx_competence_domaine     ON competences(domaine_id);
CREATE INDEX IF NOT EXISTS idx_sc_code                ON sous_competences(code);
CREATE INDEX IF NOT EXISTS idx_sc_competence          ON sous_competences(competence_id);
CREATE INDEX IF NOT EXISTS idx_savoir_code            ON savoirs(code);
CREATE INDEX IF NOT EXISTS idx_savoir_sc              ON savoirs(sous_competence_id);
CREATE INDEX IF NOT EXISTS idx_ec_enseignant          ON enseignant_competences(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_ec_savoir              ON enseignant_competences(savoir_id);
CREATE INDEX IF NOT EXISTS idx_nsr_competence_id      ON niveau_savoir_requis(competence_id);
CREATE INDEX IF NOT EXISTS idx_nsr_sous_competence_id ON niveau_savoir_requis(sous_competence_id);
CREATE INDEX IF NOT EXISTS idx_nsr_savoir_id          ON niveau_savoir_requis(savoir_id);
