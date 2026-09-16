-- V28: animateurs externes rattachés à un bureau + liaison formation ↔ animateurs externes
CREATE TABLE IF NOT EXISTS formation.animateurs_externes (
    id          BIGSERIAL    PRIMARY KEY,
    nom         VARCHAR(100) NOT NULL,
    prenom      VARCHAR(100) NOT NULL,
    email       VARCHAR(255),
    bureau_id   BIGINT       NOT NULL REFERENCES formation.bureaux (id) ON DELETE CASCADE,
    created_at  TIMESTAMP,
    updated_at  TIMESTAMP,
    created_by  VARCHAR(150),
    updated_by  VARCHAR(150),
    version     BIGINT       DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_animateurs_externes_bureau
    ON formation.animateurs_externes (bureau_id);

-- Table de liaison N..N entre formations et animateurs externes
CREATE TABLE IF NOT EXISTS formation.formation_animateur_externe (
    formation_id          BIGINT NOT NULL REFERENCES formation.formations (id_formation) ON DELETE CASCADE,
    animateur_externe_id  BIGINT NOT NULL REFERENCES formation.animateurs_externes (id) ON DELETE CASCADE,
    PRIMARY KEY (formation_id, animateur_externe_id)
);
