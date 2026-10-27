-- V24 : le rattachement UP / departement passe du DOMAINE a la COMPETENCE.
--
-- Contexte : jusqu'ici un domaine portait un seul up_id / departement_id
-- (colonnes varchar ajoutees par V8 puis V9). L'IHM demande desormais de
-- choisir plusieurs UP et plusieurs departements, optionnellement, au niveau
-- de la competence. Deux tables d'association portent ce choix.
--
-- Les colonnes domaines.up_id / departement_id sont CONSERVEES : les services
-- d'analyse predictive et RICE les lisent encore (perimetre des referentiels).
-- Elles ne sont simplement plus alimentees par l'IHM.
--
-- Regle de repli appliquee cote code : une competence sans aucun rattachement
-- explicite retombe sur les colonnes historiques de son domaine. Le backfill
-- ci-dessous rend ce repli inutile pour les donnees existantes, sans jamais
-- ecraser un choix saisi.
--
-- Idempotent : CREATE TABLE IF NOT EXISTS + ON CONFLICT DO NOTHING.

CREATE TABLE IF NOT EXISTS competence_ups (
    competence_id BIGINT       NOT NULL,
    up_id         VARCHAR(255) NOT NULL,
    CONSTRAINT pk_competence_ups PRIMARY KEY (competence_id, up_id),
    CONSTRAINT fk_competence_ups_competence
        FOREIGN KEY (competence_id) REFERENCES competences (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_competence_ups_up ON competence_ups (up_id);

CREATE TABLE IF NOT EXISTS competence_departements (
    competence_id  BIGINT       NOT NULL,
    departement_id VARCHAR(255) NOT NULL,
    CONSTRAINT pk_competence_departements PRIMARY KEY (competence_id, departement_id),
    CONSTRAINT fk_competence_departements_competence
        FOREIGN KEY (competence_id) REFERENCES competences (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_competence_departements_dept
    ON competence_departements (departement_id);

-- Backfill : chaque competence herite du rattachement de son domaine.
INSERT INTO competence_ups (competence_id, up_id)
SELECT c.id, BTRIM(d.up_id)
FROM competences c
JOIN domaines d ON d.id = c.domaine_id
WHERE d.up_id IS NOT NULL AND BTRIM(d.up_id) <> ''
ON CONFLICT DO NOTHING;

INSERT INTO competence_departements (competence_id, departement_id)
SELECT c.id, BTRIM(d.departement_id)
FROM competences c
JOIN domaines d ON d.id = c.domaine_id
WHERE d.departement_id IS NOT NULL AND BTRIM(d.departement_id) <> ''
ON CONFLICT DO NOTHING;
