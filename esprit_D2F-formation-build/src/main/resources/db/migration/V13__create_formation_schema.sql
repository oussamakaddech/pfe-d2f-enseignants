-- ============================================================================
-- Flyway Migration V13: Create formation schema
-- ============================================================================
-- Purpose: Version explicite du schema PostgreSQL pour le service formation.
--          Auparavant le schema dependait de Hibernate ddl-auto=update,
--          source de drift inter-environnements.
-- Idempotence: CREATE TABLE IF NOT EXISTS + DO $$ blocs pour les contraintes
--              FK, supporte les reexecutions sans erreurs et bootstrap les
--              environnements vierges.
-- Mapping:    Entites JPA esprit.pfe.serviceformation.entities.*
-- Conformite: DSI §3.2 - versioning explicite du schema
-- ============================================================================

-- Tables parentes (pas de dependances)
CREATE TABLE IF NOT EXISTS departements (
    id VARCHAR(50) PRIMARY KEY,
    libelle VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS ups (
    id VARCHAR(50) PRIMARY KEY,
    libelle VARCHAR(255)
);

-- Enseignants avec FK vers UP et Dept
CREATE TABLE IF NOT EXISTS enseignants (
    id VARCHAR(10) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(30) NOT NULL,
    mail VARCHAR(255) NOT NULL,
    type VARCHAR(1) NOT NULL,
    etat VARCHAR(1) NOT NULL,
    cup VARCHAR(1) NOT NULL,
    chefdepartement VARCHAR(1) NOT NULL,
    up_id VARCHAR(50),
    dept_id VARCHAR(50)
);

-- Formations
CREATE TABLE IF NOT EXISTS formations (
    id_formation BIGSERIAL PRIMARY KEY,
    id_besoin_formation BIGINT,
    type_besoin VARCHAR(255),
    titre_formation VARCHAR(255) NOT NULL,
    domaine VARCHAR(255),
    competance VARCHAR(255),
    population_cible VARCHAR(255),
    objectifs TEXT,
    objectifs_pedago TEXT,
    eval_methods TEXT,
    type_formation VARCHAR(50),
    externe_formateur_nom VARCHAR(100),
    externe_formateur_prenom VARCHAR(100),
    externe_formateur_email VARCHAR(255),
    organisme_ref_externe VARCHAR(255),
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    etat_formation VARCHAR(50) NOT NULL,
    cout_transport REAL,
    cout_hebergement REAL,
    cout_repas REAL,
    cout_formation REAL,
    prerequis TEXT,
    acquis TEXT,
    indicateurs TEXT,
    charge_horaire_global INTEGER,
    certif_generated BOOLEAN NOT NULL DEFAULT FALSE,
    up_id VARCHAR(50),
    departement_id VARCHAR(50),
    inscriptions_ouvertes BOOLEAN NOT NULL DEFAULT FALSE,
    ouverte BOOLEAN NOT NULL DEFAULT FALSE,
    period_code VARCHAR(50),
    custom_period_label VARCHAR(255),
    last_refresh_date TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS documents (
    id_document BIGSERIAL PRIMARY KEY,
    nom_document VARCHAR(255),
    file_path VARCHAR(255),
    date DATE,
    obligation BOOLEAN,
    path_type VARCHAR(255) NOT NULL,
    formation_id BIGINT
);

CREATE TABLE IF NOT EXISTS seances (
    id_seance BIGSERIAL PRIMARY KEY,
    date_seance DATE,
    heure_debut TIME,
    heure_fin TIME,
    type_seance VARCHAR(50),
    contenus TEXT,
    methodes TEXT,
    duree_theorique REAL,
    duree_pratique REAL,
    salle VARCHAR(255),
    calendar_event_id VARCHAR(255),
    online_meeting_url VARCHAR(500),
    formation_id BIGINT
);

CREATE TABLE IF NOT EXISTS inscriptions (
    id BIGSERIAL PRIMARY KEY,
    formation_id BIGINT NOT NULL,
    enseignant_id VARCHAR(10) NOT NULL,
    etat VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    date_demande TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (formation_id, enseignant_id)
);

CREATE TABLE IF NOT EXISTS presences (
    id_participation BIGSERIAL PRIMARY KEY,
    presence BOOLEAN,
    commentaire VARCHAR(255),
    seance_id BIGINT,
    enseignant_id VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS formation_competences (
    id BIGSERIAL PRIMARY KEY,
    formation_id BIGINT NOT NULL,
    domaine_id BIGINT,
    competence_id BIGINT NOT NULL,
    competence_nom VARCHAR(255),
    sous_competence_id BIGINT,
    sous_competence_nom VARCHAR(255),
    savoir_id BIGINT,
    savoir_nom VARCHAR(255),
    savoir_type VARCHAR(20),
    niveau_prerequis INTEGER,
    niveau_vise INTEGER
);

-- Tables de jointure ManyToMany
CREATE TABLE IF NOT EXISTS seance_animateur (
    seance_id BIGINT NOT NULL,
    enseignant_id VARCHAR(10) NOT NULL,
    PRIMARY KEY (seance_id, enseignant_id)
);

CREATE TABLE IF NOT EXISTS seance_participant (
    seance_id BIGINT NOT NULL,
    enseignant_id VARCHAR(10) NOT NULL,
    PRIMARY KEY (seance_id, enseignant_id)
);

-- ============================================================================
-- Foreign keys (idempotentes)
-- ============================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='enseignants' AND constraint_name='fk_enseignants_up') THEN
        ALTER TABLE enseignants ADD CONSTRAINT fk_enseignants_up
            FOREIGN KEY (up_id) REFERENCES ups(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='enseignants' AND constraint_name='fk_enseignants_dept') THEN
        ALTER TABLE enseignants ADD CONSTRAINT fk_enseignants_dept
            FOREIGN KEY (dept_id) REFERENCES departements(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='formations' AND constraint_name='fk_formations_up') THEN
        ALTER TABLE formations ADD CONSTRAINT fk_formations_up
            FOREIGN KEY (up_id) REFERENCES ups(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='formations' AND constraint_name='fk_formations_dept') THEN
        ALTER TABLE formations ADD CONSTRAINT fk_formations_dept
            FOREIGN KEY (departement_id) REFERENCES departements(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='documents' AND constraint_name='fk_documents_formation') THEN
        ALTER TABLE documents ADD CONSTRAINT fk_documents_formation
            FOREIGN KEY (formation_id) REFERENCES formations(id_formation) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='seances' AND constraint_name='fk_seances_formation') THEN
        ALTER TABLE seances ADD CONSTRAINT fk_seances_formation
            FOREIGN KEY (formation_id) REFERENCES formations(id_formation) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='inscriptions' AND constraint_name='fk_inscriptions_formation') THEN
        ALTER TABLE inscriptions ADD CONSTRAINT fk_inscriptions_formation
            FOREIGN KEY (formation_id) REFERENCES formations(id_formation) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='inscriptions' AND constraint_name='fk_inscriptions_enseignant') THEN
        ALTER TABLE inscriptions ADD CONSTRAINT fk_inscriptions_enseignant
            FOREIGN KEY (enseignant_id) REFERENCES enseignants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='presences' AND constraint_name='fk_presences_seance') THEN
        ALTER TABLE presences ADD CONSTRAINT fk_presences_seance
            FOREIGN KEY (seance_id) REFERENCES seances(id_seance) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='presences' AND constraint_name='fk_presences_enseignant') THEN
        ALTER TABLE presences ADD CONSTRAINT fk_presences_enseignant
            FOREIGN KEY (enseignant_id) REFERENCES enseignants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='formation_competences' AND constraint_name='fk_formation_competences_formation') THEN
        ALTER TABLE formation_competences ADD CONSTRAINT fk_formation_competences_formation
            FOREIGN KEY (formation_id) REFERENCES formations(id_formation) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='seance_animateur' AND constraint_name='fk_seance_animateur_seance') THEN
        ALTER TABLE seance_animateur ADD CONSTRAINT fk_seance_animateur_seance
            FOREIGN KEY (seance_id) REFERENCES seances(id_seance) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='seance_animateur' AND constraint_name='fk_seance_animateur_enseignant') THEN
        ALTER TABLE seance_animateur ADD CONSTRAINT fk_seance_animateur_enseignant
            FOREIGN KEY (enseignant_id) REFERENCES enseignants(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='seance_participant' AND constraint_name='fk_seance_participant_seance') THEN
        ALTER TABLE seance_participant ADD CONSTRAINT fk_seance_participant_seance
            FOREIGN KEY (seance_id) REFERENCES seances(id_seance) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE table_name='seance_participant' AND constraint_name='fk_seance_participant_enseignant') THEN
        ALTER TABLE seance_participant ADD CONSTRAINT fk_seance_participant_enseignant
            FOREIGN KEY (enseignant_id) REFERENCES enseignants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- Indexes pour FK et recherches frequentes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_enseignants_up_id ON enseignants(up_id);
CREATE INDEX IF NOT EXISTS idx_enseignants_dept_id ON enseignants(dept_id);
CREATE INDEX IF NOT EXISTS idx_enseignants_mail ON enseignants(mail);

CREATE INDEX IF NOT EXISTS idx_formations_up_id ON formations(up_id);
CREATE INDEX IF NOT EXISTS idx_formations_dept_id ON formations(departement_id);
CREATE INDEX IF NOT EXISTS idx_formations_etat ON formations(etat_formation);
CREATE INDEX IF NOT EXISTS idx_formations_date_debut ON formations(date_debut);
CREATE INDEX IF NOT EXISTS idx_formations_date_fin ON formations(date_fin);

CREATE INDEX IF NOT EXISTS idx_documents_formation_id ON documents(formation_id);

CREATE INDEX IF NOT EXISTS idx_seances_formation_id ON seances(formation_id);
CREATE INDEX IF NOT EXISTS idx_seances_date ON seances(date_seance);

CREATE INDEX IF NOT EXISTS idx_inscriptions_formation_id ON inscriptions(formation_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_enseignant_id ON inscriptions(enseignant_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_etat ON inscriptions(etat);

CREATE INDEX IF NOT EXISTS idx_presences_seance_id ON presences(seance_id);
CREATE INDEX IF NOT EXISTS idx_presences_enseignant_id ON presences(enseignant_id);

CREATE INDEX IF NOT EXISTS idx_formation_competences_formation_id
    ON formation_competences(formation_id);
CREATE INDEX IF NOT EXISTS idx_formation_competences_competence_id
    ON formation_competences(competence_id);

CREATE INDEX IF NOT EXISTS idx_seance_animateur_seance_id ON seance_animateur(seance_id);
CREATE INDEX IF NOT EXISTS idx_seance_animateur_enseignant_id ON seance_animateur(enseignant_id);

CREATE INDEX IF NOT EXISTS idx_seance_participant_seance_id ON seance_participant(seance_id);
CREATE INDEX IF NOT EXISTS idx_seance_participant_enseignant_id ON seance_participant(enseignant_id);
