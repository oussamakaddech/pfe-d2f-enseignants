ALTER TABLE certificates
    ADD COLUMN IF NOT EXISTS certificate_number VARCHAR(40),
    ADD COLUMN IF NOT EXISTS verification_token VARCHAR(100),
    ADD COLUMN IF NOT EXISTS verification_hash VARCHAR(128),
    ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS certificate_status VARCHAR(20);

UPDATE certificates
SET certificate_number = 'CERT-LEGACY-' || id_certificate,
    verification_token = md5('legacy-' || id_certificate),
    verification_hash = md5('legacy-hash-' || id_certificate),
    issued_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    certificate_status = 'ISSUED'
WHERE certificate_number IS NULL;

ALTER TABLE certificates
    ALTER COLUMN certificate_number SET NOT NULL,
    ALTER COLUMN verification_token SET NOT NULL,
    ALTER COLUMN verification_hash SET NOT NULL,
    ALTER COLUMN issued_at SET NOT NULL,
    ALTER COLUMN certificate_status SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_certificate_number ON certificates(certificate_number);
CREATE UNIQUE INDEX IF NOT EXISTS uq_certificate_verification_token ON certificates(verification_token);