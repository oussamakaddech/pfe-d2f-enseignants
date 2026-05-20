-- V19: table de liaison besoin_formation <-> compétences RICE
CREATE TABLE IF NOT EXISTS besoin.besoin_competences (
    id                  BIGSERIAL    PRIMARY KEY,
    besoin_id           BIGINT       NOT NULL,
    domaine_id          BIGINT,
    competence_id       BIGINT,
    competence_nom      VARCHAR(255),
    savoir_id           BIGINT,
    savoir_nom          VARCHAR(255),
    sous_competence_id  BIGINT
);

CREATE INDEX IF NOT EXISTS idx_besoin_comp_besoin ON besoin.besoin_competences (besoin_id);
