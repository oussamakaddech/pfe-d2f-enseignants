-- S-3: Add JPA audit trail columns to evaluation service tables
ALTER TABLE evaluation_globale
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS version     BIGINT DEFAULT 0 NOT NULL;

ALTER TABLE evaluation_formateur
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS version     BIGINT DEFAULT 0 NOT NULL;
