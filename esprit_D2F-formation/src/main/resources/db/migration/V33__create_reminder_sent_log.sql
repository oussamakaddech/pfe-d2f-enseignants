-- FIX-S2: Deduplication table for J-7/J-3/J-1 reminder emails.
-- Prevents re-sending the same reminder type to the same participant for the same séance.
CREATE TABLE IF NOT EXISTS formation.reminder_sent_log (
    id                BIGSERIAL PRIMARY KEY,
    seance_id         BIGINT        NOT NULL,
    recipient_email   VARCHAR(255)  NOT NULL,
    reminder_type     VARCHAR(10)   NOT NULL, -- 'J-7', 'J-3', 'J-1'
    sent_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_reminder_sent UNIQUE (seance_id, recipient_email, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_reminder_sent_seance
    ON formation.reminder_sent_log (seance_id, reminder_type);
