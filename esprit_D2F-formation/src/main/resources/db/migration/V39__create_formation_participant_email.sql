-- Adresses e-mail des participants rattachées à une formation, importées depuis
-- les sections « participants » du calendrier des ateliers. Table d'extension
-- (enfant de formations) : évite de fabriquer de fausses fiches Enseignant.
CREATE TABLE IF NOT EXISTS formation.formation_participant_email (
    id                  BIGSERIAL PRIMARY KEY,
    formation_id        BIGINT       NOT NULL REFERENCES formation.formations (id_formation) ON DELETE CASCADE,
    email               VARCHAR(255) NOT NULL,
    matched_enseignant  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_formation_participant_email UNIQUE (formation_id, email)
);

CREATE INDEX IF NOT EXISTS idx_fpe_email ON formation.formation_participant_email (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_fpe_formation ON formation.formation_participant_email (formation_id);
