-- S-3: Add JPA audit trail columns to besoin-formation service tables
ALTER TABLE besoin_formation
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS version     BIGINT DEFAULT 0 NOT NULL;

ALTER TABLE besoin_competences
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS version     BIGINT DEFAULT 0 NOT NULL;

-- notification already has created_at from V15; add missing audit columns only
ALTER TABLE notification
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS version     BIGINT DEFAULT 0 NOT NULL;
