-- Journal des imports de calendrier d'ateliers (.xlsx). Métadonnées agrégées
-- uniquement : aucune donnée nominative persistée ici.
CREATE TABLE IF NOT EXISTS formation.import_log (
    id                     BIGSERIAL PRIMARY KEY,
    file_name              VARCHAR(255),
    file_size_bytes        BIGINT,
    file_hash              VARCHAR(64),
    imported_by            VARCHAR(150),
    imported_at            TIMESTAMP    NOT NULL DEFAULT NOW(),
    formations_created     INTEGER      NOT NULL DEFAULT 0,
    sessions_created       INTEGER      NOT NULL DEFAULT 0,
    participants_imported  INTEGER      NOT NULL DEFAULT 0,
    rows_skipped           INTEGER      NOT NULL DEFAULT 0,
    conflicts_detected     INTEGER      NOT NULL DEFAULT 0,
    status                 VARCHAR(20)  NOT NULL DEFAULT 'SUCCESS'
);

CREATE INDEX IF NOT EXISTS idx_import_log_hash ON formation.import_log (file_hash);
CREATE INDEX IF NOT EXISTS idx_import_log_imported_at ON formation.import_log (imported_at);
