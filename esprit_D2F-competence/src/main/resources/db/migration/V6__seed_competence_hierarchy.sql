-- V6__seed_competence_hierarchy.sql
-- Données d'exemple : hiérarchie complète domaines → compétences → sous-compétences → savoirs
-- + affectations enseignants-savoirs
-- Idempotent : ON CONFLICT (code) DO NOTHING sur toutes les tables hiérarchiques

-- ── Domaines ──────────────────────────────────────────────────────────────────
INSERT INTO domaines (code, nom, description, actif, created_at, created_by, version) VALUES
    ('DEV',    'Développement Logiciel',             'Ingénierie logicielle, backend, frontend, qualité', true, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('RESEAU', 'Réseaux et Cybersécurité',           'Infrastructure réseau, sécurité applicative et systèmes', true, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('AI',     'Intelligence Artificielle & Data',   'Machine Learning, Deep Learning, Data Science', true, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('PEDAG',  'Pédagogie et Ingénierie de Formation','Méthodes pédagogiques, conception de cours, évaluation', true, '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

-- ── Compétences ───────────────────────────────────────────────────────────────
INSERT INTO competences (code, nom, description, ordre, domaine_id, created_at, created_by, version) VALUES
    ('DEV.BACK',  'Développement Backend',         'Architecture backend, APIs, bases de données',          1, (SELECT id FROM domaines WHERE code='DEV'),    '2026-01-01 08:00:00', 'migration-seed', 0),
    ('DEV.FRONT', 'Développement Frontend',        'Interfaces utilisateur, frameworks JS, UX',             2, (SELECT id FROM domaines WHERE code='DEV'),    '2026-01-01 08:00:00', 'migration-seed', 0),
    ('DEV.QA',    'Qualité & Tests',               'Tests unitaires, intégration, CI/CD, DevOps',           3, (SELECT id FROM domaines WHERE code='DEV'),    '2026-01-01 08:00:00', 'migration-seed', 0),
    ('RES.SEC',   'Sécurité Applicative',          'OWASP, cryptographie, authentification sécurisée',      1, (SELECT id FROM domaines WHERE code='RESEAU'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('RES.INFRA', 'Infrastructure & Cloud',        'Virtualisation, conteneurs, cloud computing',           2, (SELECT id FROM domaines WHERE code='RESEAU'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('AI.ML',     'Machine Learning',              'Algorithmes supervisés et non supervisés',              1, (SELECT id FROM domaines WHERE code='AI'),     '2026-01-01 08:00:00', 'migration-seed', 0),
    ('AI.DL',     'Deep Learning',                 'Réseaux de neurones, CNN, NLP',                         2, (SELECT id FROM domaines WHERE code='AI'),     '2026-01-01 08:00:00', 'migration-seed', 0),
    ('PED.CONC',  'Conception Pédagogique',        'Ingénierie de formation, objectifs pédagogiques',       1, (SELECT id FROM domaines WHERE code='PEDAG'),  '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

-- ── Sous-compétences (niveau=1, parent_id=NULL = directement sous une compétence) ────
INSERT INTO sous_competences (code, nom, description, competence_id, niveau, created_at, created_by, version) VALUES
    ('DEV.BACK.SPRING', 'Spring Framework',          'Spring Boot, Spring Security, Spring Data',  (SELECT id FROM competences WHERE code='DEV.BACK'),  1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('DEV.BACK.API',    'Conception d''APIs REST',   'REST, OpenAPI, versioning, pagination',       (SELECT id FROM competences WHERE code='DEV.BACK'),  1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('DEV.BACK.DB',     'Bases de Données',          'SQL, ORM, migrations, optimisation',          (SELECT id FROM competences WHERE code='DEV.BACK'),  1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('DEV.FRONT.REACT', 'React.js',                  'Hooks, composants, state management',         (SELECT id FROM competences WHERE code='DEV.FRONT'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('DEV.FRONT.CSS',   'CSS & Design Systems',      'Tailwind, Ant Design, responsive design',     (SELECT id FROM competences WHERE code='DEV.FRONT'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('DEV.QA.TEST',     'Tests Automatisés',         'JUnit, Mockito, Cypress, TDD',                (SELECT id FROM competences WHERE code='DEV.QA'),    1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('DEV.QA.DEVOPS',   'DevOps & CI/CD',            'Docker, GitHub Actions, SonarQube',           (SELECT id FROM competences WHERE code='DEV.QA'),    1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('RES.SEC.OWASP',   'OWASP & Sécurité Web',      'Top 10, XSS, injection, CSRF',                (SELECT id FROM competences WHERE code='RES.SEC'),   1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('RES.SEC.CRYPTO',  'Cryptographie Appliquée',   'TLS, JWT, OAuth2, hachage',                   (SELECT id FROM competences WHERE code='RES.SEC'),   1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('RES.INFRA.CLOUD', 'Cloud & Conteneurisation',  'Docker, Kubernetes, AWS/Azure',               (SELECT id FROM competences WHERE code='RES.INFRA'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('AI.ML.SUPERV',    'Apprentissage Supervisé',   'Régression, classification, validation croisée',(SELECT id FROM competences WHERE code='AI.ML'),   1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('AI.ML.UNSUPERV',  'Apprentissage Non Supervisé','Clustering, réduction de dimensionnalité',   (SELECT id FROM competences WHERE code='AI.ML'),    1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('AI.DL.CNN',       'Réseaux de Neurones Conv.', 'Vision par ordinateur, traitement d''images', (SELECT id FROM competences WHERE code='AI.DL'),    1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('PED.CONC.OBJ',    'Objectifs Pédagogiques',    'Taxonomie de Bloom, rédaction d''objectifs',  (SELECT id FROM competences WHERE code='PED.CONC'), 1, '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

-- ── Savoirs ────────────────────────────────────────────────────────────────────
-- type : SAVOIR | SAVOIR_FAIRE | SAVOIR_ETRE
-- niveau : N1_DEBUTANT | N2_ELEMENTAIRE | N3_INTERMEDIAIRE | N4_AVANCE | N5_EXPERT

INSERT INTO savoirs (code, nom, description, type, niveau, sous_competence_id, created_at, created_by, version) VALUES
    -- Spring Framework
    ('S.SPRING.BOOT',    'Spring Boot 3',               'Configuration automatique, profils, starters',              'SAVOIR_FAIRE',  'N3_INTERMEDIAIRE', (SELECT id FROM sous_competences WHERE code='DEV.BACK.SPRING'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S.SPRING.SEC',     'Spring Security',             'Authentification, autorisation, filtres de sécurité',       'SAVOIR_FAIRE',  'N4_AVANCE',        (SELECT id FROM sous_competences WHERE code='DEV.BACK.SPRING'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S.SPRING.HIBER',   'Hibernate / JPA',             'Entités, relations, JPQL, performances',                    'SAVOIR_FAIRE',  'N3_INTERMEDIAIRE', (SELECT id FROM sous_competences WHERE code='DEV.BACK.SPRING'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- APIs REST
    ('S.API.REST',       'Conception REST',             'Principes REST, conventions, versioning d''API',            'SAVOIR',        'N3_INTERMEDIAIRE', (SELECT id FROM sous_competences WHERE code='DEV.BACK.API'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S.API.OPENAPI',    'OpenAPI / Swagger',           'Documentation d''API avec OpenAPI 3.0',                     'SAVOIR_FAIRE',  'N2_ELEMENTAIRE',   (SELECT id FROM sous_competences WHERE code='DEV.BACK.API'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Bases de données
    ('S.DB.POSTGRESQL',  'PostgreSQL Avancé',           'Schémas, index, requêtes optimisées, partitionnement',      'SAVOIR_FAIRE',  'N3_INTERMEDIAIRE', (SELECT id FROM sous_competences WHERE code='DEV.BACK.DB'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S.DB.FLYWAY',      'Flyway — Migrations SQL',     'Versionning de schéma, migrations Flyway',                  'SAVOIR_FAIRE',  'N2_ELEMENTAIRE',   (SELECT id FROM sous_competences WHERE code='DEV.BACK.DB'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- React
    ('S.REACT.HOOKS',    'React Hooks',                 'useState, useEffect, useContext, hooks personnalisés',       'SAVOIR_FAIRE',  'N3_INTERMEDIAIRE', (SELECT id FROM sous_competences WHERE code='DEV.FRONT.REACT'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S.REACT.TS',       'React + TypeScript',          'Typage fort des composants et des props',                   'SAVOIR_FAIRE',  'N3_INTERMEDIAIRE', (SELECT id FROM sous_competences WHERE code='DEV.FRONT.REACT'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S.REACT.STATE',    'State Management',            'Redux Toolkit, Zustand, React Query',                       'SAVOIR',        'N2_ELEMENTAIRE',   (SELECT id FROM sous_competences WHERE code='DEV.FRONT.REACT'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Tests
    ('S.TEST.JUNIT',     'JUnit 5 & Mockito',           'Tests unitaires et d''intégration Spring Boot',             'SAVOIR_FAIRE',  'N3_INTERMEDIAIRE', (SELECT id FROM sous_competences WHERE code='DEV.QA.TEST'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S.TEST.CYPRESS',   'Cypress — Tests E2E',         'Tests end-to-end sur applications web',                     'SAVOIR_FAIRE',  'N2_ELEMENTAIRE',   (SELECT id FROM sous_competences WHERE code='DEV.QA.TEST'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- DevOps
    ('S.DEVOPS.DOCKER',  'Docker & Docker Compose',     'Conteneurisation, images, réseaux Docker',                  'SAVOIR_FAIRE',  'N3_INTERMEDIAIRE', (SELECT id FROM sous_competences WHERE code='DEV.QA.DEVOPS'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S.DEVOPS.CICD',    'CI/CD GitHub Actions',        'Pipelines automatisés, déploiement continu',                'SAVOIR_FAIRE',  'N2_ELEMENTAIRE',   (SELECT id FROM sous_competences WHERE code='DEV.QA.DEVOPS'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Sécurité OWASP
    ('S.SEC.OWASP10',    'OWASP Top 10',                'Connaissance des 10 vulnérabilités critiques',              'SAVOIR',        'N3_INTERMEDIAIRE', (SELECT id FROM sous_competences WHERE code='RES.SEC.OWASP'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S.SEC.PENTEST',    'Tests de Pénétration Web',    'Méthodologie de pentest, outils (Burp Suite, OWASP ZAP)',   'SAVOIR_FAIRE',  'N3_INTERMEDIAIRE', (SELECT id FROM sous_competences WHERE code='RES.SEC.OWASP'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Cryptographie
    ('S.CRYPTO.JWT',     'JWT & OAuth2',                'Génération, validation et révocation de tokens JWT',        'SAVOIR_FAIRE',  'N3_INTERMEDIAIRE', (SELECT id FROM sous_competences WHERE code='RES.SEC.CRYPTO'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Cloud
    ('S.CLOUD.K8S',      'Kubernetes Fondamentaux',     'Pods, services, déploiements, ingress',                     'SAVOIR',        'N2_ELEMENTAIRE',   (SELECT id FROM sous_competences WHERE code='RES.INFRA.CLOUD'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Machine Learning
    ('S.ML.SKLEARN',     'Scikit-learn',                'Pipeline ML, modèles classiques, validation croisée',       'SAVOIR_FAIRE',  'N2_ELEMENTAIRE',   (SELECT id FROM sous_competences WHERE code='AI.ML.SUPERV'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S.ML.EVAL',        'Évaluation de Modèles ML',    'Métriques, matrice de confusion, courbe ROC',               'SAVOIR',        'N3_INTERMEDIAIRE', (SELECT id FROM sous_competences WHERE code='AI.ML.SUPERV'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S.ML.CLUSTER',     'Clustering (K-Means, DBSCAN)','Segmentation non supervisée de données',                    'SAVOIR_FAIRE',  'N2_ELEMENTAIRE',   (SELECT id FROM sous_competences WHERE code='AI.ML.UNSUPERV'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Deep Learning
    ('S.DL.TF',          'TensorFlow / Keras',          'Construction et entraînement de réseaux de neurones',       'SAVOIR_FAIRE',  'N3_INTERMEDIAIRE', (SELECT id FROM sous_competences WHERE code='AI.DL.CNN'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Pédagogie
    ('S.PED.BLOOM',      'Taxonomie de Bloom',          'Niveaux cognitifs et rédaction d''objectifs pédagogiques',  'SAVOIR',        'N2_ELEMENTAIRE',   (SELECT id FROM sous_competences WHERE code='PED.CONC.OBJ'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S.PED.FOAD',       'Formation à Distance (FOAD)', 'Conception de cours en ligne, LMS, scénarisation',          'SAVOIR_FAIRE',  'N2_ELEMENTAIRE',   (SELECT id FROM sous_competences WHERE code='PED.CONC.OBJ'), '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

-- ── Enseignant-Compétences (affecter savoirs aux enseignants) ─────────────────
-- ENS001 : Backend Java
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS001', id, 'N4_AVANCE',        '2024-06-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.SPRING.BOOT'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS001', id, 'N4_AVANCE',        '2024-06-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.SPRING.HIBER'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS001', id, 'N3_INTERMEDIAIRE', '2024-06-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.API.REST'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS001', id, 'N3_INTERMEDIAIRE', '2024-06-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.DEVOPS.DOCKER'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS001', id, 'N2_ELEMENTAIRE',   '2025-01-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.TEST.JUNIT'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;

-- ENS002 : Frontend React
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS002', id, 'N4_AVANCE',        '2024-09-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.REACT.HOOKS'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS002', id, 'N3_INTERMEDIAIRE', '2024-09-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.REACT.TS'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS002', id, 'N2_ELEMENTAIRE',   '2025-03-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.ML.SKLEARN'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;

-- ENS003 : Sécurité réseau
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS003', id, 'N4_AVANCE',        '2023-12-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.SEC.OWASP10'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS003', id, 'N3_INTERMEDIAIRE', '2023-12-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.SEC.PENTEST'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS003', id, 'N3_INTERMEDIAIRE', '2023-12-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.CRYPTO.JWT'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS003', id, 'N2_ELEMENTAIRE',   '2024-06-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.DEVOPS.DOCKER'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;

-- ENS004 : Chef de département, polyvalent
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS004', id, 'N3_INTERMEDIAIRE', '2024-01-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.SPRING.BOOT'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS004', id, 'N3_INTERMEDIAIRE', '2024-01-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.PED.BLOOM'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS004', id, 'N4_AVANCE',        '2022-01-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.PED.FOAD'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;

-- ENS005 : Fullstack
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS005', id, 'N4_AVANCE',        '2024-03-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.API.REST'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS005', id, 'N3_INTERMEDIAIRE', '2024-03-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.REACT.HOOKS'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS005', id, 'N3_INTERMEDIAIRE', '2025-01-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.DB.POSTGRESQL'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_at, created_by, version)
SELECT 'ENS005', id, 'N2_ELEMENTAIRE',   '2025-06-01', '2026-01-01 08:00:00', 'migration-seed', 0 FROM savoirs WHERE code = 'S.DEVOPS.CICD'
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
