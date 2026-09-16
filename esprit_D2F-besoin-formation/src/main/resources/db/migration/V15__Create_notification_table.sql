CREATE TABLE IF NOT EXISTS notification (
    id_notification BIGSERIAL PRIMARY KEY,
    message VARCHAR(255),
    username VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    commentaire VARCHAR(255)
);
