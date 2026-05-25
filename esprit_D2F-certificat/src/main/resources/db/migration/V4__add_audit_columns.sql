-- S-3: Add JPA audit trail columns to certificat service tables
ALTER TABLE certificates
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS version     BIGINT DEFAULT 0 NOT NULL;
