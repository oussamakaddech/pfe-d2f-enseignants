-- ============================================================================
-- Seed catalogue D2F — jeux de données de démonstration
-- ============================================================================
-- Référentiel mini D2F : domaines / compétences / savoirs (schéma catalogue)
-- + formations / compétences de formation / inscriptions (schéma formation.*)
--
-- Compatibilité : tables réelles du service formation (formation.*) et du
-- service predictive-analytics. Idempotence : ON CONFLICT DO NOTHING partout.
-- Rejouable sans erreur (CREATE TABLE IF NOT EXISTS + INSERT ... ON CONFLICT).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Référentiel catalogue (nouveau schéma, non destructif)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS catalogue;

CREATE TABLE IF NOT EXISTS catalogue.domaines (
    id          VARCHAR(20) PRIMARY KEY,
    code        VARCHAR(50) NOT NULL,
    nom         VARCHAR(150) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS catalogue.competences (
    id          INTEGER PRIMARY KEY,
    code        VARCHAR(20) NOT NULL,
    nom         VARCHAR(150) NOT NULL,
    domaine_id  VARCHAR(20) NOT NULL REFERENCES catalogue.domaines(id),
    prerequis   INTEGER NOT NULL DEFAULT 1,
    description TEXT
);

CREATE TABLE IF NOT EXISTS catalogue.savoirs (
    id             INTEGER PRIMARY KEY,
    code           VARCHAR(20) NOT NULL,
    nom            VARCHAR(200) NOT NULL,
    competence_id  INTEGER NOT NULL REFERENCES catalogue.competences(id),
    savoir_type    VARCHAR(20) NOT NULL
);

INSERT INTO catalogue.domaines (id, code, nom, description) VALUES
  ('DOM01', 'PEDAGOGIE',      'Pédagogie & évaluation',          'Conception de séquences, évaluation par compétences et numérique éducatif'),
  ('DOM02', 'GENIE_LOGICIEL', 'Génie logiciel & DevOps',         'Intégration continue, qualité du code et sécurité applicative'),
  ('DOM03', 'DATA_IA',        'Science des données & IA responsable', 'Ingénierie des données, apprentissage automatique et IA générative'),
  ('DOM04', 'SOFT_SKILLS',    'Soft skills & encadrement',       'Encadrement de PFE, gestion agile et communication technique')
ON CONFLICT (id) DO NOTHING;

INSERT INTO catalogue.competences (id, code, nom, domaine_id, prerequis, description) VALUES
  ( 1, 'COMP01', 'Scénarisation pédagogique active',       'DOM01', 4, 'Concevoir des séquences et activités pédagogiques actives'),
  ( 2, 'COMP02', 'Évaluation par compétences',             'DOM01', 4, 'Évaluer les acquis par compétences (grilles critériées, LMS)'),
  ( 3, 'COMP03', 'Classe inversée & numérique éducatif',   'DOM01', 3, 'Animer une classe inversée et intégrer le numérique'),
  ( 4, 'COMP04', 'CI/CD & intégration continue',           'DOM02', 3, 'Automatiser l''intégration et le déploiement continus'),
  ( 5, 'COMP05', 'Qualité & revue de code',                'DOM02', 4, 'Assurer la qualité logicielle et mener des revues de code'),
  ( 6, 'COMP06', 'Sécurité applicative',                   'DOM02', 3, 'Sécuriser les applications (OWASP, durcissement)'),
  ( 7, 'COMP07', 'Data engineering & pipelines',           'DOM03', 4, 'Concevoir des pipelines et entrepôts de données fiables'),
  ( 8, 'COMP08', 'Machine learning appliqué',              'DOM03', 4, 'Appliquer des modèles ML à des cas d''usage concrets'),
  ( 9, 'COMP09', 'IA générative responsable',              'DOM03', 3, 'Utiliser l''IA générative de façon responsable et pédagogique'),
  (10, 'COMP10', 'Encadrement de PFE',                     'DOM04', 4, 'Encadrer des projets de fin d''études et des stages'),
  (11, 'COMP11', 'Gestion de projet agile',                'DOM04', 3, 'Gérer des projets en mode agile (Scrum/Kanban)'),
  (12, 'COMP12', 'Communication & anglais technique',      'DOM04', 3, 'Communiquer, rédiger et présenter en anglais technique')
ON CONFLICT (id) DO NOTHING;

INSERT INTO catalogue.savoirs (id, code, nom, competence_id, savoir_type) VALUES
  ( 1, 'SAV01',  'Concevoir des objectifs pédagogiques (taxonomie de Bloom)', 1, 'SAVOIR'),
  ( 2, 'SAV02',  'Scénariser des activités actives présentiel/distanciel',    1, 'SAVOIR_FAIRE'),
  ( 3, 'SAV03',  'Principes de l''évaluation par compétences',                2, 'SAVOIR'),
  ( 4, 'SAV04',  'Construire des grilles critériées (Moodle/LMS)',            2, 'SAVOIR_FAIRE'),
  ( 5, 'SAV05',  'Modèles théoriques de classe inversée',                     3, 'SAVOIR'),
  ( 6, 'SAV06',  'Animer des séances synchrones interactives',                3, 'SAVOIR_FAIRE'),
  ( 7, 'SAV07',  'Concepts d''intégration et de déploiement continus',        4, 'SAVOIR'),
  ( 8, 'SAV08',  'Écrire des pipelines GitLab CI/GitHub Actions',             4, 'SAVOIR_FAIRE'),
  ( 9, 'SAV09',  'Métriques de qualité logicielle',                           5, 'SAVOIR'),
  (10, 'SAV10',  'Mener des revues de code efficaces',                        5, 'SAVOIR_FAIRE'),
  (11, 'SAV11',  'Top 10 OWASP et menaces applicatives',                      6, 'SAVOIR'),
  (12, 'SAV12',  'Durcir une application et analyser des vulnérabilités',     6, 'SAVOIR_FAIRE'),
  (13, 'SAV13',  'Architectures des données et ETL/ELT',                      7, 'SAVOIR'),
  (14, 'SAV14',  'Construire des pipelines de données avec Python',           7, 'SAVOIR_FAIRE'),
  (15, 'SAV15',  'Concepts de machine learning supervisé',                    8, 'SAVOIR'),
  (16, 'SAV16',  'Entraîner et évaluer des modèles (scikit-learn)',           8, 'SAVOIR_FAIRE'),
  (17, 'SAV17',  'Cadre d''usage responsable de l''IA générative',            9, 'SAVOIR'),
  (18, 'SAV18',  'Intégrer des LLM dans les pratiques pédagogiques',          9, 'SAVOIR_FAIRE'),
  (19, 'SAV19',  'Référentiel d''encadrement et éthique de soutenance',      10, 'SAVOIR'),
  (20, 'SAV20',  'Suivre et évaluer un projet de fin d''études',             10, 'SAVOIR_FAIRE'),
  (21, 'SAV21',  'Principes Scrum et Kanban',                                11, 'SAVOIR'),
  (22, 'SAV22',  'Animer sprints et rituels agiles',                         11, 'SAVOIR_FAIRE'),
  (23, 'SAV23',  'Rédaction scientifique et technique en anglais',           12, 'SAVOIR'),
  (24, 'SAV24',  'Présenter un sujet technique en anglais',                  12, 'SAVOIR_FAIRE')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Formations (schema formation, table formations)
--    Idempotent sur la PK id_formation (insertion explicite 1001+).
-- ---------------------------------------------------------------------------
INSERT INTO formation.formations
    (id_formation, titre_formation, domaine, type_formation, period_code,
     date_debut, date_fin, etat_formation, inscriptions_ouvertes, ouverte,
     charge_horaire_global, prerequis, population_cible, objectifs)
VALUES
  (1001, 'Scénarisation pédagogique active',            'DOM01', 'HYBRIDE',      'WINTER',   '2026-09-15', '2026-10-10', 'PLANIFIE', TRUE,  TRUE,  24, 'Niveau 4 en COMP01', 'Enseignants', 'Maîtriser la scénarisation de séquences actives'),
  (1002, 'Évaluation par compétences (LMS)',            'DOM01', 'DISTANCIEL',   'WINTER',   '2026-09-22', '2026-10-17', 'PLANIFIE', TRUE,  TRUE,  18, 'Niveau 4 en COMP02', 'Enseignants', 'Évaluer par compétences avec des grilles critériées'),
  (1003, 'Classe inversée & numérique éducatif',        'DOM01', 'PRESENTIEL',   'WINTER',   '2026-10-06', '2026-10-31', 'PLANIFIE', TRUE,  TRUE,  21, 'Aucun', 'Enseignants', 'Animer une classe inversée enrichie du numérique'),
  (1004, 'Scénariser un module hybride',                'DOM01', 'HYBRIDE',      'SPRINT',   '2026-11-10', '2026-11-28', 'PLANIFIE', TRUE,  TRUE,  30, 'Niveau 3 en COMP01', 'Enseignants & chargés TC', 'Concevoir un module hybride complet'),
  (1005, 'Grilles d''évaluation Moodle',                'DOM01', 'DISTANCIEL',   'SUMMER',   '2026-05-12', '2026-06-06', 'ACHEVE',   FALSE, FALSE, 12, 'Aucun', 'Enseignants', 'Construire des grilles d''évaluation dans Moodle'),
  (1006, 'Pédagogie active : les bases',                'DOM01', 'PRESENTIEL',   'WINTER',   '2026-01-13', '2026-02-07', 'ACHEVE',   FALSE, FALSE, 21, 'Aucun', 'Enseignants', 'Découvrir les fondamentaux de la pédagogie active'),
  (1007, 'Numérique éducatif',                          'DOM01', 'DISTANCIEL',   'SUMMER',   '2026-06-16', '2026-07-11', 'ACHEVE',   FALSE, FALSE, 15, 'Aucun', 'Enseignants', 'Intégrer les outils numériques dans l''enseignement'),
  (1008, 'Évaluation par compétences avancée',          'DOM01', 'HYBRIDE',      'SUMMER',   '2026-07-28', '2026-09-19', 'EN_COURS', FALSE, TRUE,  24, 'Niveau 3 en COMP02', 'Enseignants', 'Approfondir l''évaluation par compétences'),
  (1009, 'CI/CD Pipelines GitLab',                      'DOM02', 'DISTANCIEL',   'WINTER',   '2026-09-29', '2026-10-24', 'PLANIFIE', TRUE,  TRUE,  24, 'Niveau 3 en COMP04', 'Enseignants Génie Logiciel', 'Automatiser les pipelines GitLab CI/CD'),
  (1010, 'Qualité & revue de code',                     'DOM02', 'PRESENTIEL',   'WINTER',   '2026-10-13', '2026-11-07', 'PLANIFIE', TRUE,  TRUE,  18, 'Niveau 4 en COMP05', 'Enseignants Génie Logiciel', 'Définir et pratiquer la revue de code'),
  (1011, 'Sécurité applicative OWASP',                  'DOM02', 'DISTANCIEL',   'WINTER',   '2026-11-17', '2026-12-12', 'PLANIFIE', TRUE,  TRUE,  21, 'Niveau 3 en COMP06', 'Enseignants Informatique', 'Appliquer le Top 10 OWASP'),
  (1012, 'Conteneurs & CI DevOps',                      'DOM02', 'HYBRIDE',      'SUMMER',   '2026-07-21', '2026-09-12', 'EN_COURS', FALSE, TRUE,  30, 'Aucun', 'Enseignants Génie Logiciel', 'Maîtriser Docker et la CI DevOps'),
  (1013, 'Revue de code & sécurité en pratique',        'DOM02', 'PRESENTIEL',   'SPRINT',   '2026-11-24', '2026-12-12', 'PLANIFIE', TRUE,  TRUE,  27, 'Niveau 3 en COMP05', 'Enseignants Génie Logiciel', 'Mettre en pratique revue de code et sécurité'),
  (1014, 'Durcissement applicatif',                     'DOM02', 'DISTANCIEL',   'WINTER',   '2026-02-10', '2026-03-07', 'ACHEVE',   FALSE, FALSE, 21, 'Aucun', 'Enseignants Informatique', 'Durcir une application et traiter les vulnérabilités'),
  (1015, 'DevSecOps end-to-end',                        'DOM02', 'HYBRIDE',      'SPRINT',   '2026-10-20', '2026-11-07', 'PLANIFIE', TRUE,  TRUE,  36, 'Niveau 3 en COMP04', 'Enseignants Génie Logiciel', 'Intégrer la sécurité dans tout le cycle DevOps'),
  (1016, 'Data engineering & pipelines',                'DOM03', 'DISTANCIEL',   'WINTER',   '2026-09-08', '2026-10-03', 'PLANIFIE', TRUE,  TRUE,  30, 'Niveau 4 en COMP07', 'Enseignants Data', 'Construire des pipelines de données fiables'),
  (1017, 'Machine learning appliqué',                   'DOM03', 'HYBRIDE',      'WINTER',   '2026-10-20', '2026-11-14', 'PLANIFIE', TRUE,  TRUE,  36, 'Niveau 4 en COMP08', 'Enseignants Data', 'Appliquer des modèles ML à des cas concrets'),
  (1018, 'IA générative responsable',                   'DOM03', 'DISTANCIEL',   'WINTER',   '2026-11-03', '2026-11-28', 'PLANIFIE', TRUE,  TRUE,  24, 'Aucun', 'Tous enseignants', 'Utiliser l''IA générative de façon responsable'),
  (1019, 'Python pour la data',                         'DOM03', 'PRESENTIEL',   'SUMMER',   '2026-06-30', '2026-08-22', 'EN_COURS', FALSE, TRUE,  33, 'Aucun', 'Enseignants Data', 'Programmer en Python pour l''analyse de données'),
  (1020, 'MLOps & déploiement',                         'DOM03', 'DISTANCIEL',   'SPRINT',   '2026-11-24', '2026-12-12', 'PLANIFIE', TRUE,  TRUE,  27, 'Niveau 3 en COMP08', 'Enseignants Data', 'Industrialiser et déployer des modèles ML'),
  (1021, 'Data governance',                             'DOM03', 'PRESENTIEL',   'WINTER',   '2026-01-27', '2026-02-21', 'ACHEVE',   FALSE, FALSE, 18, 'Aucun', 'Enseignants Data', 'Appliquer les principes de gouvernance des données'),
  (1022, 'ML & IA éthique en pratique',                 'DOM03', 'HYBRIDE',      'WINTER',   '2026-10-27', '2026-11-21', 'PLANIFIE', TRUE,  TRUE,  30, 'Niveau 3 en COMP08', 'Enseignants Data', 'Entraîner des modèles et cadrer l''usage de l''IA'),
  (1023, 'Encadrement de PFE',                          'DOM04', 'PRESENTIEL',   'WINTER',   '2026-09-22', '2026-10-17', 'PLANIFIE', TRUE,  TRUE,  18, 'Niveau 4 en COMP10', 'Encadrants PFE', 'Structurer l''encadrement des projets de fin d''études'),
  (1024, 'Gestion de projet agile Scrum',               'DOM04', 'DISTANCIEL',   'WINTER',   '2026-10-06', '2026-10-31', 'PLANIFIE', TRUE,  TRUE,  21, 'Aucun', 'Enseignants & encadrants', 'Animer un projet en mode Scrum'),
  (1025, 'Communication en anglais technique',          'DOM04', 'DISTANCIEL',   'WINTER',   '2026-11-03', '2026-11-28', 'PLANIFIE', TRUE,  TRUE,  24, 'Aucun', 'Tous enseignants', 'Communiquer et rédiger en anglais technique'),
  (1026, 'Mentorat & suivi de stage',                   'DOM04', 'PRESENTIEL',   'SUMMER',   '2026-07-14', '2026-08-08', 'ACHEVE',   FALSE, FALSE, 15, 'Aucun', 'Encadrants PFE', 'Mentorer des stagiaires et suivre leur progression'),
  (1027, 'Animation de board agile',                    'DOM04', 'PRESENTIEL',   'WINTER',   '2026-02-24', '2026-03-21', 'ACHEVE',   FALSE, FALSE, 12, 'Aucun', 'Enseignants', 'Animer les rituels d''un board agile'),
  (1028, 'Rédaction scientifique en anglais',           'DOM04', 'DISTANCIEL',   'SPRINT',   '2026-11-24', '2026-12-12', 'PLANIFIE', TRUE,  TRUE,  21, 'Niveau 3 en COMP12', 'Enseignants-chercheurs', 'Rédiger des articles scientifiques en anglais'),
  (1029, 'Évaluer par compétences dans les projets',    'DOM04', 'HYBRIDE',      'WINTER',   '2026-12-01', '2026-12-26', 'PLANIFIE', TRUE,  TRUE,  24, 'Niveau 3 en COMP02', 'Encadrants PFE', 'Évaluer les compétences au sein des projets'),
  (1030, 'IA générative dans la pédagogie',             'DOM01', 'WORKSHOP',     'WORKSHOP', '2026-10-27', '2026-10-31', 'PLANIFIE', TRUE,  TRUE,  10, 'Aucun', 'Tous enseignants', 'Exploiter l''IA générative dans les pratiques pédagogiques')
ON CONFLICT (id_formation) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Compétences des formations (schema formation, table formation_competences)
--    Idempotent sur la PK id (insertion explicite 1..52).
-- ---------------------------------------------------------------------------
INSERT INTO formation.formation_competences
    (id, formation_id, competence_id, competence_nom, savoir_id, savoir_nom,
     savoir_type, niveau_prerequis, niveau_vise)
VALUES
  ( 1, 1001, 1, 'Scénarisation pédagogique active',      1, 'Concevoir des objectifs pédagogiques (taxonomie de Bloom)', 'SAVOIR',        4, 5),
  ( 2, 1001, 1, 'Scénarisation pédagogique active',      2, 'Scénariser des activités actives présentiel/distanciel',    'SAVOIR_FAIRE',   4, 5),
  ( 3, 1002, 2, 'Évaluation par compétences',            3, 'Principes de l''évaluation par compétences',                'SAVOIR',        4, 5),
  ( 4, 1002, 2, 'Évaluation par compétences',            4, 'Construire des grilles critériées (Moodle/LMS)',            'SAVOIR_FAIRE',   4, 5),
  ( 5, 1003, 3, 'Classe inversée & numérique éducatif',  5, 'Modèles théoriques de classe inversée',                     'SAVOIR',        3, 4),
  ( 6, 1003, 3, 'Classe inversée & numérique éducatif',  6, 'Animer des séances synchrones interactives',                'SAVOIR_FAIRE',   3, 4),
  ( 7, 1004, 1, 'Scénarisation pédagogique active',      2, 'Scénariser des activités actives présentiel/distanciel',    'SAVOIR_FAIRE',   3, 5),
  ( 8, 1004, 3, 'Classe inversée & numérique éducatif',  6, 'Animer des séances synchrones interactives',                'SAVOIR_FAIRE',   3, 4),
  ( 9, 1005, 2, 'Évaluation par compétences',            4, 'Construire des grilles critériées (Moodle/LMS)',            'SAVOIR_FAIRE',   4, 4),
  (10, 1006, 1, 'Scénarisation pédagogique active',      1, 'Concevoir des objectifs pédagogiques (taxonomie de Bloom)', 'SAVOIR',        4, 5),
  (11, 1007, 3, 'Classe inversée & numérique éducatif',  5, 'Modèles théoriques de classe inversée',                     'SAVOIR',        3, 4),
  (12, 1008, 2, 'Évaluation par compétences',            4, 'Construire des grilles critériées (Moodle/LMS)',            'SAVOIR_FAIRE',   3, 5),
  (13, 1009, 4, 'CI/CD & intégration continue',          7, 'Concepts d''intégration et de déploiement continus',        'SAVOIR',        3, 5),
  (14, 1009, 4, 'CI/CD & intégration continue',          8, 'Écrire des pipelines GitLab CI/GitHub Actions',             'SAVOIR_FAIRE',   3, 5),
  (15, 1010, 5, 'Qualité & revue de code',               9, 'Métriques de qualité logicielle',                           'SAVOIR',        4, 5),
  (16, 1010, 5, 'Qualité & revue de code',              10, 'Mener des revues de code efficaces',                        'SAVOIR_FAIRE',   4, 5),
  (17, 1011, 6, 'Sécurité applicative',                 11, 'Top 10 OWASP et menaces applicatives',                      'SAVOIR',        3, 5),
  (18, 1011, 6, 'Sécurité applicative',                 12, 'Durcir une application et analyser des vulnérabilités',     'SAVOIR_FAIRE',   3, 5),
  (19, 1012, 4, 'CI/CD & intégration continue',          8, 'Écrire des pipelines GitLab CI/GitHub Actions',             'SAVOIR_FAIRE',   3, 4),
  (20, 1013, 5, 'Qualité & revue de code',              10, 'Mener des revues de code efficaces',                        'SAVOIR_FAIRE',   3, 4),
  (21, 1013, 6, 'Sécurité applicative',                 12, 'Durcir une application et analyser des vulnérabilités',     'SAVOIR_FAIRE',   3, 4),
  (22, 1014, 6, 'Sécurité applicative',                 12, 'Durcir une application et analyser des vulnérabilités',     'SAVOIR_FAIRE',   3, 4),
  (23, 1015, 4, 'CI/CD & intégration continue',          8, 'Écrire des pipelines GitLab CI/GitHub Actions',             'SAVOIR_FAIRE',   3, 5),
  (24, 1015, 5, 'Qualité & revue de code',               9, 'Métriques de qualité logicielle',                           'SAVOIR',        3, 5),
  (25, 1015, 6, 'Sécurité applicative',                 11, 'Top 10 OWASP et menaces applicatives',                      'SAVOIR',        3, 5),
  (26, 1016, 7, 'Data engineering & pipelines',         13, 'Architectures des données et ETL/ELT',                      'SAVOIR',        4, 5),
  (27, 1016, 7, 'Data engineering & pipelines',         14, 'Construire des pipelines de données avec Python',           'SAVOIR_FAIRE',   4, 5),
  (28, 1017, 8, 'Machine learning appliqué',            15, 'Concepts de machine learning supervisé',                    'SAVOIR',        4, 5),
  (29, 1017, 8, 'Machine learning appliqué',            16, 'Entraîner et évaluer des modèles (scikit-learn)',           'SAVOIR_FAIRE',   4, 5),
  (30, 1018, 9, 'IA générative responsable',            17, 'Cadre d''usage responsable de l''IA générative',            'SAVOIR',        3, 4),
  (31, 1018, 9, 'IA générative responsable',            18, 'Intégrer des LLM dans les pratiques pédagogiques',          'SAVOIR_FAIRE',   3, 4),
  (32, 1019, 7, 'Data engineering & pipelines',         14, 'Construire des pipelines de données avec Python',           'SAVOIR_FAIRE',   3, 4),
  (33, 1020, 8, 'Machine learning appliqué',            16, 'Entraîner et évaluer des modèles (scikit-learn)',           'SAVOIR_FAIRE',   3, 4),
  (34, 1020, 9, 'IA générative responsable',            18, 'Intégrer des LLM dans les pratiques pédagogiques',          'SAVOIR_FAIRE',   3, 4),
  (35, 1021, 7, 'Data engineering & pipelines',         13, 'Architectures des données et ETL/ELT',                      'SAVOIR',        4, 4),
  (36, 1022, 8, 'Machine learning appliqué',            16, 'Entraîner et évaluer des modèles (scikit-learn)',           'SAVOIR_FAIRE',   3, 5),
  (37, 1022, 9, 'IA générative responsable',            17, 'Cadre d''usage responsable de l''IA générative',            'SAVOIR',        3, 4),
  (38, 1023, 10, 'Encadrement de PFE',                 19, 'Référentiel d''encadrement et éthique de soutenance',      'SAVOIR',        4, 5),
  (39, 1023, 10, 'Encadrement de PFE',                 20, 'Suivre et évaluer un projet de fin d''études',             'SAVOIR_FAIRE',   4, 5),
  (40, 1024, 11, 'Gestion de projet agile',            21, 'Principes Scrum et Kanban',                                 'SAVOIR',        3, 4),
  (41, 1024, 11, 'Gestion de projet agile',            22, 'Animer sprints et rituels agiles',                          'SAVOIR_FAIRE',   3, 4),
  (42, 1025, 12, 'Communication & anglais technique',  23, 'Rédaction scientifique et technique en anglais',            'SAVOIR',        3, 4),
  (43, 1025, 12, 'Communication & anglais technique',  24, 'Présenter un sujet technique en anglais',                   'SAVOIR_FAIRE',   3, 4),
  (44, 1026, 10, 'Encadrement de PFE',                 20, 'Suivre et évaluer un projet de fin d''études',             'SAVOIR_FAIRE',   3, 4),
  (45, 1026, 11, 'Gestion de projet agile',            22, 'Animer sprints et rituels agiles',                          'SAVOIR_FAIRE',   3, 4),
  (46, 1026, 12, 'Communication & anglais technique',  24, 'Présenter un sujet technique en anglais',                   'SAVOIR_FAIRE',   3, 4),
  (47, 1027, 11, 'Gestion de projet agile',            22, 'Animer sprints et rituels agiles',                          'SAVOIR_FAIRE',   3, 3),
  (48, 1028, 12, 'Communication & anglais technique',  24, 'Présenter un sujet technique en anglais',                   'SAVOIR_FAIRE',   3, 4),
  (49, 1029, 2,  'Évaluation par compétences',          4, 'Construire des grilles critériées (Moodle/LMS)',            'SAVOIR_FAIRE',   3, 5),
  (50, 1029, 10, 'Encadrement de PFE',                 19, 'Référentiel d''encadrement et éthique de soutenance',      'SAVOIR',        3, 5),
  (51, 1030, 3,  'Classe inversée & numérique éducatif', 6, 'Animer des séances synchrones interactives',               'SAVOIR_FAIRE',   3, 4),
  (52, 1030, 9,  'IA générative responsable',          18, 'Intégrer des LLM dans les pratiques pédagogiques',          'SAVOIR_FAIRE',   3, 4)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Inscriptions d'échantillon (schema formation, table inscriptions)
--    Ensignants ENS001..ENS030, ids formations 1001+.
--    Idempotent sur la contrainte UNIQUE (formation_id, enseignant_id).
--    ENS001 : 2 formations suivies dans le passé (APPROVED).
--    ENS002 : aucune inscription. ENS003 : 1 formation en cours (APPROVED).
-- ---------------------------------------------------------------------------
INSERT INTO formation.inscriptions (formation_id, enseignant_id, etat, date_demande) VALUES
  (1005, 'ENS001', 'APPROVED', '2026-04-10 09:15:00+00'),
  (1026, 'ENS001', 'APPROVED', '2026-06-01 14:00:00+00'),
  (1008, 'ENS003', 'APPROVED', '2026-07-05 11:30:00+00'),
  (1001, 'ENS004', 'PENDING',  '2026-08-01 10:00:00+00'),
  (1002, 'ENS006', 'APPROVED', '2026-07-20 09:00:00+00'),
  (1003, 'ENS007', 'PENDING',  '2026-08-05 16:20:00+00'),
  (1005, 'ENS008', 'APPROVED', '2026-04-25 08:45:00+00'),
  (1006, 'ENS009', 'APPROVED', '2026-01-10 09:30:00+00'),
  (1007, 'ENS010', 'APPROVED', '2026-05-28 13:10:00+00'),
  (1027, 'ENS011', 'APPROVED', '2026-02-12 10:00:00+00'),
  (1026, 'ENS012', 'APPROVED', '2026-06-09 15:00:00+00'),
  (1014, 'ENS013', 'APPROVED', '2026-01-22 11:00:00+00'),
  (1021, 'ENS014', 'APPROVED', '2026-01-18 09:20:00+00'),
  (1005, 'ENS015', 'REJECTED', '2026-04-05 10:10:00+00'),
  (1008, 'ENS016', 'PENDING',  '2026-08-08 14:30:00+00'),
  (1011, 'ENS017', 'PENDING',  '2026-08-12 09:00:00+00'),
  (1019, 'ENS018', 'APPROVED', '2026-06-15 11:45:00+00'),
  (1012, 'ENS019', 'APPROVED', '2026-07-01 10:30:00+00'),
  (1002, 'ENS020', 'APPROVED', '2026-07-22 16:00:00+00'),
  (1022, 'ENS021', 'PENDING',  '2026-08-14 09:50:00+00'),
  (1023, 'ENS022', 'APPROVED', '2026-07-28 10:15:00+00'),
  (1024, 'ENS023', 'PENDING',  '2026-08-15 11:00:00+00'),
  (1010, 'ENS024', 'APPROVED', '2026-07-30 09:30:00+00'),
  (1016, 'ENS025', 'PENDING',  '2026-08-10 15:40:00+00'),
  (1017, 'ENS026', 'APPROVED', '2026-07-25 12:00:00+00'),
  (1018, 'ENS027', 'APPROVED', '2026-08-02 10:20:00+00'),
  (1025, 'ENS028', 'PENDING',  '2026-08-11 09:10:00+00'),
  (1028, 'ENS029', 'APPROVED', '2026-07-29 14:45:00+00'),
  (1004, 'ENS030', 'PENDING',  '2026-08-13 13:00:00+00'),
  (1009, 'ENS005', 'APPROVED', '2026-08-03 10:00:00+00'),
  (1015, 'ENS001', 'REJECTED', '2026-08-06 09:25:00+00'),
  (1020, 'ENS003', 'PENDING',  '2026-08-09 16:10:00+00'),
  (1013, 'ENS004', 'APPROVED', '2026-08-04 11:35:00+00'),
  (1029, 'ENS006', 'APPROVED', '2026-08-07 15:00:00+00'),
  (1001, 'ENS011', 'APPROVED', '2026-07-18 09:40:00+00'),
  (1003, 'ENS015', 'APPROVED', '2026-07-15 10:55:00+00'),
  (1010, 'ENS020', 'REJECTED', '2026-07-12 14:00:00+00'),
  (1024, 'ENS009', 'APPROVED', '2026-07-16 11:20:00+00'),
  (1017, 'ENS012', 'APPROVED', '2026-07-10 09:05:00+00'),
  (1016, 'ENS023', 'APPROVED', '2026-07-08 10:45:00+00')
ON CONFLICT (formation_id, enseignant_id) DO NOTHING;