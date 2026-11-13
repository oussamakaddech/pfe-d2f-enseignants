-- Questionnaire de satisfaction des participants (modèle « Summer workshop :
-- Évaluation des formations ») : une réponse par participant et par formation.
-- Échelle 1..5 : 1 Pas du tout satisfaisant, 2 Pas satisfaisant,
-- 3 Moyennement satisfaisant, 4 Satisfaisant, 5 Très satisfaisant.
-- L'identité du participant sert uniquement à empêcher une double réponse et à
-- l'éligibilité aux certificats : les statistiques sont anonymes (UP seule).
CREATE TABLE IF NOT EXISTS formation_feedback (
    id                      BIGSERIAL PRIMARY KEY,
    formation_id            BIGINT       NOT NULL,
    enseignant_id           VARCHAR(64)  NOT NULL,
    participant_email       VARCHAR(255),
    up                      VARCHAR(255),
    aspect_organisationnel  INTEGER      NOT NULL CHECK (aspect_organisationnel BETWEEN 1 AND 5),
    aspect_technique        INTEGER      NOT NULL CHECK (aspect_technique BETWEEN 1 AND 5),
    aspect_pedagogique      INTEGER      NOT NULL CHECK (aspect_pedagogique BETWEEN 1 AND 5),
    besoin_complementaire   BOOLEAN      NOT NULL,
    autres_informations     VARCHAR(2000),
    autres_besoins          VARCHAR(2000),
    created_at              TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_formation_feedback UNIQUE (formation_id, enseignant_id)
);

CREATE INDEX IF NOT EXISTS idx_formation_feedback_formation ON formation_feedback (formation_id);
