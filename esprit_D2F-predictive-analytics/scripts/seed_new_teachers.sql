-- =============================================================================
-- Seed : 3 nouveaux enseignants avec profils varies (critique / moyen / faible)
-- Chacun est rattache a une UP + departement et possede des affectations de
-- savoirs coherentes avec sa specialite.
-- Idempotent : ON CONFLICT DO NOTHING partout.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Enseignants
-- -----------------------------------------------------------------------------
-- ENS_T01 : profil CRITIQUE — Developpement Backend, niveaux faibles sur ses
--           savoirs cles (Spring, API REST, PostgreSQL)
-- ENS_T02 : profil MOYEN — Data/Machine Learning, niveaux intermediaires
-- ENS_T03 : profil FAIBLE gap — Pedagogie Numerique, quasi expert

-- type: 'T'=titulaire, 'V'=vacataire ; etat: 'A'=actif ; cup/chef_departement: 'N'/'Y'
INSERT INTO formation.enseignants
    (id, nom, prenom, mail, type, etat, cup, chef_departement,
     up_id, dept_id, grade, specialite, user_id, date_recrutement,
     created_at, created_by, version)
VALUES
    ('ENS_T01', 'SALHI', 'Rania', 'rania.salhi@esprit.tn', 'T', 'A',
     'N', 'N', 'UP_GL', 'DEPT_GL', 'Assistant', 'Developpement Backend Java / Spring',
     'U-ENS-T01', DATE '2022-09-01', NOW(), 'seed-scope-analysis', 0),

    ('ENS_T02', 'BEN AMOR', 'Khalil', 'khalil.benamor@esprit.tn', 'T', 'A',
     'N', 'N', 'UP_IA', 'DEPT_IA', 'Maitre Assistant', 'Machine Learning & Data Science',
     'U-ENS-T02', DATE '2019-02-01', NOW(), 'seed-scope-analysis', 0),

    ('ENS_T03', 'FARHAT', 'Sonia', 'sonia.farhat@esprit.tn', 'T', 'A',
     'N', 'Y', 'UP_INF2', 'DEPT_INF2', 'Professeur', 'Pedagogie & Ingenierie de Formation',
     'U-ENS-T03', DATE '2010-09-01', NOW(), 'seed-scope-analysis', 0)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2) Affectations de savoirs (competence.enseignant_competences)
--    Niveaux volontairement contrastes pour produire des gaps differents.
-- -----------------------------------------------------------------------------

-- ENS_T01 (Dev Backend / DEPT_GL / UP_GL) : gaps CRITIQUES sur ses savoirs cles
-- Savoirs : 1 Spring Boot (cible max N5), 2 Spring Sec (N5), 4 REST (N5),
--           6 PostgreSQL (N5), 8 React Hooks (N5), 13 Docker (N5)
INSERT INTO competence.enseignant_competences
    (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
VALUES
    ('ENS_T01',  1, 'N1_DEBUTANT',     DATE '2023-03-01', NOW(), 'seed-scope-analysis', 0),
    ('ENS_T01',  2, 'N1_DEBUTANT',     DATE '2023-03-01', NOW(), 'seed-scope-analysis', 0),
    ('ENS_T01',  4, 'N2_ELEMENTAIRE',  DATE '2023-06-01', NOW(), 'seed-scope-analysis', 0),
    ('ENS_T01',  6, 'N2_ELEMENTAIRE',  DATE '2024-01-01', NOW(), 'seed-scope-analysis', 0),
    ('ENS_T01',  8, 'N1_DEBUTANT',     DATE '2024-02-01', NOW(), 'seed-scope-analysis', 0),
    ('ENS_T01', 13, 'N2_ELEMENTAIRE',  DATE '2024-05-01', NOW(), 'seed-scope-analysis', 0)
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;

-- ENS_T02 (ML & Data / DEPT_IA / UP_IA) : gaps MOYENS
-- Savoirs : 19 sklearn (N3), 20 ML eval (N3), 21 clustering (N2),
--           22 DL/TF (N5 -> N2 = gros gap), 25 Pandas (N3), 26 Airflow (N5 -> N3)
INSERT INTO competence.enseignant_competences
    (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
VALUES
    ('ENS_T02', 19, 'N3_INTERMEDIAIRE', DATE '2021-09-01', NOW(), 'seed-scope-analysis', 0),
    ('ENS_T02', 20, 'N3_INTERMEDIAIRE', DATE '2022-01-01', NOW(), 'seed-scope-analysis', 0),
    ('ENS_T02', 21, 'N2_ELEMENTAIRE',   DATE '2022-06-01', NOW(), 'seed-scope-analysis', 0),
    ('ENS_T02', 22, 'N2_ELEMENTAIRE',   DATE '2023-01-01', NOW(), 'seed-scope-analysis', 0),
    ('ENS_T02', 25, 'N4_AVANCE',        DATE '2021-03-01', NOW(), 'seed-scope-analysis', 0),
    ('ENS_T02', 26, 'N3_INTERMEDIAIRE', DATE '2023-09-01', NOW(), 'seed-scope-analysis', 0)
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;

-- ENS_T03 (Pedagogie / DEPT_INF2 / UP_INF2, chef departement) : gaps FAIBLES
-- Savoirs : 23 Bloom (N5 requis -> N5), 24 FOAD (N5 -> N4),
--           30 Moodle (N3 -> N3), 31 Video (N3 -> N3)
INSERT INTO competence.enseignant_competences
    (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
VALUES
    ('ENS_T03', 23, 'N5_EXPERT',        DATE '2015-09-01', NOW(), 'seed-scope-analysis', 0),
    ('ENS_T03', 24, 'N4_AVANCE',        DATE '2016-03-01', NOW(), 'seed-scope-analysis', 0),
    ('ENS_T03', 30, 'N4_AVANCE',        DATE '2018-01-01', NOW(), 'seed-scope-analysis', 0),
    ('ENS_T03', 31, 'N3_INTERMEDIAIRE', DATE '2019-06-01', NOW(), 'seed-scope-analysis', 0)
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;

COMMIT;

-- Verification
SELECT e.id, e.nom, e.prenom, e.specialite, e.grade, e.up_id, e.dept_id,
       (SELECT count(*) FROM competence.enseignant_competences ec
        WHERE ec.enseignant_id = e.id) AS nb_affectations
FROM formation.enseignants e
WHERE e.id IN ('ENS_T01', 'ENS_T02', 'ENS_T03');
