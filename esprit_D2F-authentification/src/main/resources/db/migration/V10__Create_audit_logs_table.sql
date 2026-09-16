CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    details VARCHAR(500),
    ip_address VARCHAR(255),
    timestamp TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_username ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_resource ON audit_logs(resource);
