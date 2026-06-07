-- FIX-Q5: Structured email audit log — records every email send attempt.
CREATE TABLE IF NOT EXISTS formation.email_audit_log (
    id               BIGSERIAL PRIMARY KEY,
    formation_id     BIGINT        NOT NULL,
    recipient_email  VARCHAR(255)  NOT NULL,
    email_type       VARCHAR(50)   NOT NULL, -- e.g. ENREGISTREMENT, PLANIFICATION, EN_COURS, ACHEVE, ANNULATION, RAPPEL_J7...
    sent_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
    success          BOOLEAN       NOT NULL DEFAULT TRUE,
    error_message    TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_audit_formation
    ON formation.email_audit_log (formation_id, email_type);
CREATE INDEX IF NOT EXISTS idx_email_audit_sent_at
    ON formation.email_audit_log (sent_at);
