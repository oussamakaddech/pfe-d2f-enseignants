-- Étape 4-5 : cycle de vie du certificat (révocation) + compétences validées.
ALTER TABLE certificates
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS revoked_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS revocation_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS competences_validees VARCHAR(1000);

CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates (certificate_status);
CREATE INDEX IF NOT EXISTS idx_certificates_formation ON certificates (formation_id);