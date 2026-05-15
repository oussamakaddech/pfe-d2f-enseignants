-- =============================================================================
-- V2 Create certificates table — certificat-service
-- =============================================================================
-- Cree explicitement la table `certificates` et ses index/contraintes.
-- Cette migration est idempotente (IF NOT EXISTS) pour ne pas casser les
-- environnements ou le schema existe deja (legacy ddl-auto=update).
--
-- Mapping JPA : esprit.pfe.servicecertificat.entities.Certificate
--
-- Conformite DSI §3.2 : versioning explicite du schema, plus de drift entre
-- environnements.
-- =============================================================================

CREATE TABLE IF NOT EXISTS certificates (
    id_certificate         BIGSERIAL PRIMARY KEY,
    formation_id           BIGINT,
    titre_formation        VARCHAR(255),
    type_certif            VARCHAR(50),
    date_debut_formation   DATE,
    date_fin_formation     DATE,
    charge_horaire_global  INTEGER,
    enseignant_id          VARCHAR(100),
    nom_enseignant         VARCHAR(100),
    prenom_enseignant      VARCHAR(100),
    mail_enseignant        VARCHAR(255),
    dept_enseignant        VARCHAR(100),
    role_en_formation      VARCHAR(50),
    delivered              BOOLEAN NOT NULL DEFAULT FALSE,
    pdf_file_path          VARCHAR(500)
);

-- Index pour les recherches metier frequentes
CREATE INDEX IF NOT EXISTS idx_certificates_formation_id
    ON certificates(formation_id);

CREATE INDEX IF NOT EXISTS idx_certificates_enseignant_id
    ON certificates(enseignant_id);

CREATE INDEX IF NOT EXISTS idx_certificates_delivered
    ON certificates(delivered);

CREATE INDEX IF NOT EXISTS idx_certificates_type_certif
    ON certificates(type_certif);

-- Contraintes de validation metier
ALTER TABLE certificates
    DROP CONSTRAINT IF EXISTS chk_certificates_dates;

ALTER TABLE certificates
    ADD CONSTRAINT chk_certificates_dates
        CHECK (date_debut_formation IS NULL
            OR date_fin_formation IS NULL
            OR date_fin_formation >= date_debut_formation);

ALTER TABLE certificates
    DROP CONSTRAINT IF EXISTS chk_certificates_charge_horaire;

ALTER TABLE certificates
    ADD CONSTRAINT chk_certificates_charge_horaire
        CHECK (charge_horaire_global IS NULL OR charge_horaire_global >= 0);
