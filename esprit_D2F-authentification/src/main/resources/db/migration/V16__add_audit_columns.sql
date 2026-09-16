-- S-3: Add JPA audit trail columns to auth service tables (NOT audit_logs — it is itself an audit table)
ALTER TABLE auth.users
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS version     BIGINT DEFAULT 0 NOT NULL;

ALTER TABLE auth.roles
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS version     BIGINT DEFAULT 0 NOT NULL;

ALTER TABLE auth.confirmation_key
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS updated_by  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS version     BIGINT DEFAULT 0 NOT NULL;
