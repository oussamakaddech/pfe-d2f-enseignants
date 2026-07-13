-- =============================================================================
-- Migration V1 — Création de la table notification (schéma dédié)
-- DSI §3.4 : schéma "notification" possédé par app_user_notification
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification.notification (
    id_notification BIGSERIAL PRIMARY KEY,
    recipient       VARCHAR(150) NOT NULL,
    type            VARCHAR(30)  NOT NULL,
    severity        VARCHAR(15)  NOT NULL,
    title           VARCHAR(200) NOT NULL,
    message         TEXT         NOT NULL,
    read            BOOLEAN      NOT NULL DEFAULT FALSE,
    link            VARCHAR(255),
    actor           VARCHAR(150),
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    created_by      VARCHAR(150),
    updated_by      VARCHAR(150),
    version         BIGINT
);

CREATE INDEX IF NOT EXISTS idx_notification_recipient ON notification.notification (recipient);
CREATE INDEX IF NOT EXISTS idx_notification_recipient_read ON notification.notification (recipient, read);
CREATE INDEX IF NOT EXISTS idx_notification_created_at ON notification.notification (created_at DESC);
