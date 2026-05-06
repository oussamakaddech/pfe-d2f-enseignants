-- V1__baseline.sql
-- Structure initiale pour le service Formation

CREATE TABLE IF NOT EXISTS ups (
    id VARCHAR(255) PRIMARY KEY,
    libelle VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS departements (
    id VARCHAR(255) PRIMARY KEY,
    libelle VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS enseignants (
    id VARCHAR(10) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(30) NOT NULL,
    mail VARCHAR(255) NOT NULL,
    type VARCHAR(1) NOT NULL,
    etat VARCHAR(1) NOT NULL,
    cup VARCHAR(1) NOT NULL,
    chefdepartement VARCHAR(1) NOT NULL,
    up_id VARCHAR(255) REFERENCES ups(id),
    dept_id VARCHAR(255) REFERENCES departements(id)
);

CREATE TABLE IF NOT EXISTS formations (
    id_formation BIGSERIAL PRIMARY KEY,
    id_besoin_formation BIGINT,
    type_besoin VARCHAR(255),
    titre_formation VARCHAR(255) NOT NULL,
    domaine VARCHAR(255),
    competance VARCHAR(255),
    population_cible VARCHAR(255),
    objectifs VARCHAR(2000),
    objectifs_pedago VARCHAR(2000),
    eval_methods VARCHAR(2000),
    type_formation VARCHAR(50),
    externe_formateur_nom VARCHAR(100),
    externe_formateur_prenom VARCHAR(100),
    externe_formateur_email VARCHAR(255),
    organisme_ref_externe VARCHAR(255),
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    etat_formation VARCHAR(50) NOT NULL,
    cout_transport FLOAT,
    cout_hebergement FLOAT,
    cout_repas FLOAT,
    cout_formation FLOAT NOT NULL DEFAULT 0.0,
    prerequis VARCHAR(2000),
    acquis VARCHAR(2000),
    indicateurs VARCHAR(2000),
    charge_horaire_global INT NOT NULL DEFAULT 0,
    certif_generated BOOLEAN NOT NULL DEFAULT FALSE,
    up_id VARCHAR(255) REFERENCES ups(id),
    departement_id VARCHAR(255) REFERENCES departements(id),
    inscriptions_ouvertes BOOLEAN NOT NULL DEFAULT FALSE,
    ouverte BOOLEAN NOT NULL DEFAULT FALSE,
    period_code VARCHAR(50),
    custom_period_label VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS seances (
    id_seance BIGSERIAL PRIMARY KEY,
    date_seance DATE,
    heure_debut TIME,
    heure_fin TIME,
    type_seance VARCHAR(50),
    contenus VARCHAR(2000),
    methodes VARCHAR(2000),
    duree_theorique FLOAT,
    duree_pratique FLOAT,
    salle VARCHAR(255),
    calendar_event_id VARCHAR(255),
    online_meeting_url VARCHAR(500),
    formation_id BIGINT REFERENCES formations(id_formation) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inscriptions (
    id BIGSERIAL PRIMARY KEY,
    formation_id BIGINT NOT NULL REFERENCES formations(id_formation) ON DELETE CASCADE,
    enseignant_id VARCHAR(10) NOT NULL REFERENCES enseignants(id),
    etat VARCHAR(50) NOT NULL,
    date_demande TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (formation_id, enseignant_id)
);

CREATE TABLE IF NOT EXISTS presences (
    id_participation BIGSERIAL PRIMARY KEY,
    presence BOOLEAN NOT NULL,
    commentaire VARCHAR(255),
    seance_id BIGINT REFERENCES seances(id_seance) ON DELETE CASCADE,
    enseignant_id VARCHAR(10) REFERENCES enseignants(id)
);

CREATE TABLE IF NOT EXISTS documents (
    id_document BIGSERIAL PRIMARY KEY,
    nom_document VARCHAR(255),
    file_path VARCHAR(255),
    date DATE,
    obligation BOOLEAN NOT NULL DEFAULT FALSE,
    path_type VARCHAR(255) NOT NULL,
    formation_id BIGINT REFERENCES formations(id_formation) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS formation_competences (
    id BIGSERIAL PRIMARY KEY,
    formation_id BIGINT NOT NULL REFERENCES formations(id_formation) ON DELETE CASCADE,
    domaine_id BIGINT,
    competence_id BIGINT NOT NULL,
    competence_nom VARCHAR(255),
    sous_competence_id BIGINT,
    sous_competence_nom VARCHAR(255),
    savoir_id BIGINT,
    savoir_nom VARCHAR(255),
    savoir_type VARCHAR(20),
    niveau_prerequis INT,
    niveau_vise INT
);

CREATE TABLE IF NOT EXISTS seance_animateur (
    seance_id BIGINT NOT NULL REFERENCES seances(id_seance) ON DELETE CASCADE,
    enseignant_id VARCHAR(10) NOT NULL REFERENCES enseignants(id),
    PRIMARY KEY (seance_id, enseignant_id)
);

CREATE TABLE IF NOT EXISTS seance_participant (
    seance_id BIGINT NOT NULL REFERENCES seances(id_seance) ON DELETE CASCADE,
    enseignant_id VARCHAR(10) NOT NULL REFERENCES enseignants(id),
    PRIMARY KEY (seance_id, enseignant_id)
);

-- Index pour optimiser les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_formation_date_debut ON formations(date_debut);
CREATE INDEX IF NOT EXISTS idx_formation_etat ON formations(etat_formation);
CREATE INDEX IF NOT EXISTS idx_seance_date ON seances(date_seance);
CREATE INDEX IF NOT EXISTS idx_inscription_formation ON inscriptions(formation_id);
CREATE INDEX IF NOT EXISTS idx_presence_seance ON presences(seance_id);
