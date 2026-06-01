-- =============================================================================
-- V4__seed_shared_data.sql — Donnees de test pour les tables partagees
-- Necessaires au fonctionnement du service predictive-analytics.
-- NE PAS executer en production.
-- =============================================================================

-- ── Enseignants (colonnes NOT NULL: id, chefdepartement, cup, etat, mail, nom, prenom, type) ──
-- type: P=Permanent, V=Vacataire | etat: A=Actif | chefdepartement/cup: O/N
INSERT INTO enseignants (id, chefdepartement, cup, etat, mail, nom, prenom, type, dept_id, up_id) VALUES
    ('E00001', 'N', 'N', 'A', 'mohamed.benahmed@esprit.tn',  'Ben Ahmed',   'Mohamed',  'P', '1', NULL),
    ('E00002', 'N', 'N', 'A', 'fatma.trabelsi@esprit.tn',    'Trabelsi',    'Fatma',    'P', '1', NULL),
    ('E00003', 'N', 'N', 'A', 'khaled.bouaziz@esprit.tn',    'Bouaziz',     'Khaled',   'P', '2', NULL),
    ('E00004', 'N', 'N', 'A', 'salma.hamdi@esprit.tn',       'Hamdi',       'Salma',    'P', '1', NULL),
    ('E00005', 'N', 'N', 'A', 'amine.jlassi@esprit.tn',      'Jlassi',      'Amine',    'P', '3', NULL),
    ('E00006', 'N', 'N', 'A', 'rim.mansour@esprit.tn',       'Mansour',     'Rim',      'P', '4', NULL),
    ('E00007', 'N', 'N', 'A', 'youssef.khelifi@esprit.tn',   'Khelifi',     'Youssef',  'P', '1', NULL),
    ('E00008', 'N', 'N', 'A', 'ines.chaabane@esprit.tn',     'Chaabane',    'Ines',     'P', '2', NULL),
    ('E00009', 'N', 'N', 'A', 'tarek.maalej@esprit.tn',      'Maalej',      'Tarek',    'V', '1', NULL),
    ('E00010', 'N', 'N', 'A', 'nadia.gharbi@esprit.tn',      'Gharbi',      'Nadia',    'P', '3', NULL),
    ('E00011', 'N', 'N', 'A', 'omar.saidi@esprit.tn',        'Saidi',       'Omar',     'P', '4', NULL),
    ('E00012', 'N', 'N', 'A', 'leila.bensalem@esprit.tn',    'Ben Salem',   'Leila',    'P', '1', NULL),
    ('E00013', 'N', 'N', 'A', 'hassan.mbarek@esprit.tn',     'Mbarek',      'Hassan',   'V', '2', NULL),
    ('E00014', 'N', 'N', 'A', 'amina.zouari@esprit.tn',       'Zouari',      'Amina',    'P', '1', NULL),
    ('E00015', 'N', 'N', 'A', 'sami.riahi@esprit.tn',        'Riahi',       'Sami',     'P', '3', NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Domaines (colonnes NOT NULL: actif, code, nom) ──
INSERT INTO domaines (id, actif, code, nom, description, created_by, updated_by) VALUES
    (1,  true, 'INFO', 'Informatique',       'Informatique et developpement logiciel', 'seed', 'seed'),
    (2,  true, 'GLOG', 'Genie Logiciel',     'Genie logiciel et methodes agiles',      'seed', 'seed'),
    (3,  true, 'NET',  'Reseaux & Securite', 'Reseaux et cybersurite',                'seed', 'seed'),
    (4,  true, 'IA',   'Intelligence Artificielle', 'IA et Machine Learning',          'seed', 'seed'),
    (5,  true, 'DATA', 'Data Science',       'Science des donnees et Big Data',        'seed', 'seed'),
    (6,  true, 'ELEC', 'Electronique',       'Electronique et systemes embarques',     'seed', 'seed'),
    (7,  true, 'AUTO', 'Automatique',        'Automatique et controle',               'seed', 'seed'),
    (8,  true, 'TELC', 'Telecommunications',  'Telecommunications et signal',           'seed', 'seed')
ON CONFLICT (id) DO NOTHING;

-- ── Competences (colonnes NOT NULL: code, nom, domaine_id) ──
INSERT INTO competences (id, code, nom, domaine_id, description, created_by, updated_by) VALUES
    (1,  'INFO-C01', 'Programmation Python',        1, 'Programmation en Python',               'seed', 'seed'),
    (2,  'INFO-C02', 'Programmation Java',          1, 'Developpement Java/Spring',              'seed', 'seed'),
    (3,  'GLOG-C01', 'Developpement Web',           2, 'Frontend et backend web',                'seed', 'seed'),
    (4,  'INFO-C03', 'Bases de Donnees',            1, 'SQL et NoSQL',                           'seed', 'seed'),
    (5,  'GLOG-C02', 'DevOps & CI/CD',              2, 'Integration et deploiement continus',     'seed', 'seed'),
    (6,  'NET-C01',  'Cybersecurite',               3, 'Securite informatique',                  'seed', 'seed'),
    (7,  'NET-C02',  'Reseaux TCP/IP',             3, 'Administration reseaux',                  'seed', 'seed'),
    (8,  'IA-C01',   'Machine Learning',            4, 'Apprentissage automatique',               'seed', 'seed'),
    (9,  'IA-C02',   'Deep Learning',              4, 'Reseaux de neurones profonds',            'seed', 'seed'),
    (10, 'DATA-C01', 'Big Data & Spark',            5, 'Traitement de donnees massives',          'seed', 'seed'),
    (11, 'DATA-C02', 'Data Visualization',          5, 'Visualisation et reporting',              'seed', 'seed'),
    (12, 'GLOG-C03', 'Architecture Microservices',  2, 'Conception microservices',                'seed', 'seed'),
    (13, 'INFO-C04', 'Cloud Computing',             1, 'AWS, Azure, GCP',                        'seed', 'seed'),
    (14, 'ELEC-C01', 'IoT & Systemes Embarques',    6, 'Internet des objets',                     'seed', 'seed'),
    (15, 'AUTO-C01', 'Automatique Avancee',         7, 'Controle et regulation',                  'seed', 'seed'),
    (16, 'ELEC-C02', 'Signal Processing',           6, 'Traitement du signal',                    'seed', 'seed'),
    (17, 'TELC-C01', 'Communications Mobiles',      8, '4G/5G et protocoles mobiles',             'seed', 'seed'),
    (18, 'GLOG-C04', 'Agilite & Scrum',            2, 'Methodes agiles',                         'seed', 'seed'),
    (19, 'GLOG-C05', 'Tests & Qualite',            2, 'Assurance qualite logicielle',            'seed', 'seed'),
    (20, 'INFO-C05', 'Systemes Distribues',         1, 'Architecture distribuee',                  'seed', 'seed')
ON CONFLICT (id) DO NOTHING;

-- ── Sous-competences (colonnes NOT NULL: code, nom, competence_id) ──
INSERT INTO sous_competences (id, code, nom, competence_id, created_by, updated_by) VALUES
    (1,  'SC-01', 'Syntaxe Python',          1,  'seed', 'seed'),
    (2,  'SC-02', 'OOP Python',              1,  'seed', 'seed'),
    (3,  'SC-03', 'Spring Boot',             2,  'seed', 'seed'),
    (4,  'SC-04', 'React.js',                3,  'seed', 'seed'),
    (5,  'SC-05', 'PostgreSQL',              4,  'seed', 'seed'),
    (6,  'SC-06', 'Docker',                  5,  'seed', 'seed'),
    (7,  'SC-07', 'Kubernetes',              5,  'seed', 'seed'),
    (8,  'SC-08', 'Penetration Testing',     6,  'seed', 'seed'),
    (9,  'SC-09', 'Firewall & IDS',          6,  'seed', 'seed'),
    (10, 'SC-10', 'Routing & Switching',     7,  'seed', 'seed'),
    (11, 'SC-11', 'Scikit-learn',            8,  'seed', 'seed'),
    (12, 'SC-12', 'TensorFlow',              9,  'seed', 'seed'),
    (13, 'SC-13', 'Apache Spark',            10, 'seed', 'seed'),
    (14, 'SC-14', 'Power BI',                11, 'seed', 'seed'),
    (15, 'SC-15', 'API Gateway',             12, 'seed', 'seed'),
    (16, 'SC-16', 'AWS / Azure',             13, 'seed', 'seed'),
    (17, 'SC-17', 'Arduino / RPi',           14, 'seed', 'seed'),
    (18, 'SC-18', 'PID Control',             15, 'seed', 'seed'),
    (19, 'SC-19', 'DSP / FFT',               16, 'seed', 'seed'),
    (20, 'SC-20', '5G Protocols',            17, 'seed', 'seed')
ON CONFLICT (id) DO NOTHING;

-- ── Savoirs (colonnes NOT NULL: code, nom, type, competence_id, niveau) ──
-- type: THEORIQUE/PRATIQUE | niveau: N1_DEBUTANT...N5_EXPERT
INSERT INTO savoirs (id, code, nom, type, competence_id, sous_competence_id, niveau, created_by) VALUES
    (1,  'S-01',  'Variables & Types',       'THEORIQUE', 1,  1,  'N2_ELEMENTAIRE',   'seed'),
    (2,  'S-02',  'Fonctions & Modules',     'THEORIQUE', 1,  1,  'N2_ELEMENTAIRE',   'seed'),
    (3,  'S-03',  'Classes & Heritage',      'THEORIQUE', 1,  2,  'N3_INTERMEDIAIRE', 'seed'),
    (4,  'S-04',  'Annotations Spring',      'THEORIQUE', 2,  3,  'N3_INTERMEDIAIRE', 'seed'),
    (5,  'S-05',  'REST Controllers',        'PRATIQUE',  2,  3,  'N3_INTERMEDIAIRE', 'seed'),
    (6,  'S-06',  'Components React',        'PRATIQUE',  3,  4,  'N3_INTERMEDIAIRE', 'seed'),
    (7,  'S-07',  'SQL Avance',             'PRATIQUE',  4,  5,  'N3_INTERMEDIAIRE', 'seed'),
    (8,  'S-08',  'Dockerfile',             'PRATIQUE',  5,  6,  'N3_INTERMEDIAIRE', 'seed'),
    (9,  'S-09',  'Helm Charts',            'PRATIQUE',  5,  7,  'N4_AVANCE',        'seed'),
    (10, 'S-10',  'OWASP Top 10',           'THEORIQUE', 6,  8,  'N3_INTERMEDIAIRE', 'seed'),
    (11, 'S-11',  'iptables / nftables',    'PRATIQUE',  6,  9,  'N3_INTERMEDIAIRE', 'seed'),
    (12, 'S-12',  'OSPF / BGP',             'THEORIQUE', 7,  10, 'N4_AVANCE',        'seed'),
    (13, 'S-13',  'Regression Lineaire',     'THEORIQUE', 8,  11, 'N3_INTERMEDIAIRE', 'seed'),
    (14, 'S-14',  'Random Forest',          'THEORIQUE', 8,  11, 'N3_INTERMEDIAIRE', 'seed'),
    (15, 'S-15',  'CNN & Transfer Learning', 'THEORIQUE', 9,  12, 'N3_INTERMEDIAIRE', 'seed'),
    (16, 'S-16',  'MapReduce',              'THEORIQUE', 10, 13, 'N4_AVANCE',        'seed'),
    (17, 'S-17',  'DAX Formules',           'PRATIQUE',  11, 14, 'N3_INTERMEDIAIRE', 'seed'),
    (18, 'S-18',  'Rate Limiting',          'PRATIQUE',  12, 15, 'N3_INTERMEDIAIRE', 'seed'),
    (19, 'S-19',  'EC2 / S3 / Lambda',      'PRATIQUE',  13, 16, 'N4_AVANCE',        'seed'),
    (20, 'S-20',  'GPIO Programming',       'PRATIQUE',  14, 17, 'N3_INTERMEDIAIRE', 'seed'),
    (21, 'S-21',  'Z-Transform',            'THEORIQUE', 15, 18, 'N3_INTERMEDIAIRE', 'seed'),
    (22, 'S-22',  'FFT Implementation',     'PRATIQUE',  16, 19, 'N3_INTERMEDIAIRE', 'seed'),
    (23, 'S-23',  'NR Air Interface',       'THEORIQUE', 17, 20, 'N4_AVANCE',        'seed'),
    (24, 'S-24',  'Git & GitHub',           'PRATIQUE',  18, NULL, 'N2_ELEMENTAIRE', 'seed'),
    (25, 'S-25',  'JUnit & Mockito',        'PRATIQUE',  19, NULL, 'N2_ELEMENTAIRE', 'seed'),
    (26, 'S-26',  'CAP Theorem',            'THEORIQUE', 20, NULL, 'N3_INTERMEDIAIRE', 'seed'),
    (27, 'S-27',  'Pandas & NumPy',         'PRATIQUE',  1,  1,  'N3_INTERMEDIAIRE', 'seed'),
    (28, 'S-28',  'JPA / Hibernate',        'PRATIQUE',  2,  3,  'N3_INTERMEDIAIRE', 'seed'),
    (29, 'S-29',  'State Management (Redux)','PRATIQUE',  3,  4,  'N3_INTERMEDIAIRE', 'seed'),
    (30, 'S-30',  'Kafka Streams',          'PRATIQUE',  20, NULL, 'N4_AVANCE',      'seed')
ON CONFLICT (id) DO NOTHING;

-- ── Enseignant Competences ────────────────────────────────────────────────────
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition) VALUES
    -- E00001: Mohamed - Bon en Python/ML, gap en Big Data
    ('E00001', 1,  'N4_AVANCE',        '2022-09-01'),
    ('E00001', 2,  'N4_AVANCE',        '2022-09-01'),
    ('E00001', 3,  'N3_INTERMEDIAIRE', '2023-03-01'),
    ('E00001', 13, 'N3_INTERMEDIAIRE', '2023-06-01'),
    ('E00001', 14, 'N2_ELEMENTAIRE',   '2023-09-01'),
    ('E00001', 16, 'N1_DEBUTANT',      '2024-01-15'),
    ('E00001', 27, 'N4_AVANCE',        '2022-09-01'),
    ('E00001', 8,  'N2_ELEMENTAIRE',   '2024-01-15'),
    ('E00001', 26, 'N1_DEBUTANT',      NULL),
    -- E00002: Fatma - Experte Reseaux, gap en Cloud
    ('E00002', 12, 'N5_EXPERT',        '2020-01-01'),
    ('E00002', 10, 'N4_AVANCE',        '2021-06-01'),
    ('E00002', 11, 'N4_AVANCE',        '2021-09-01'),
    ('E00002', 7,  'N3_INTERMEDIAIRE', '2023-01-01'),
    ('E00002', 19, 'N1_DEBUTANT',      NULL),
    ('E00002', 6,  'N2_ELEMENTAIRE',   '2024-02-01'),
    -- E00003: Khaled - Electronique, gap en IoT
    ('E00003', 21, 'N4_AVANCE',        '2021-01-01'),
    ('E00003', 22, 'N3_INTERMEDIAIRE', '2022-06-01'),
    ('E00003', 20, 'N2_ELEMENTAIRE',   '2023-03-01'),
    ('E00003', 17, 'N1_DEBUTANT',      NULL),
    -- E00004: Salma - Dev Java, gap en DevOps
    ('E00004', 4,  'N4_AVANCE',        '2021-09-01'),
    ('E00004', 5,  'N3_INTERMEDIAIRE', '2022-06-01'),
    ('E00004', 28, 'N4_AVANCE',        '2021-09-01'),
    ('E00004', 8,  'N1_DEBUTANT',      NULL),
    ('E00004', 9,  'N1_DEBUTANT',      NULL),
    ('E00004', 25, 'N2_ELEMENTAIRE',   '2023-09-01'),
    -- E00005: Amine - Mecanique, gap en Automatique
    ('E00005', 21, 'N2_ELEMENTAIRE',   '2023-01-01'),
    ('E00005', 18, 'N1_DEBUTANT',      NULL),
    -- E00006: Rim - Telecom, bonne couverture
    ('E00006', 23, 'N4_AVANCE',        '2021-01-01'),
    ('E00006', 16, 'N3_INTERMEDIAIRE', '2022-06-01'),
    ('E00006', 22, 'N3_INTERMEDIAIRE', '2022-09-01'),
    -- E00007: Youssef - Python expert, gap en ML
    ('E00007', 1,  'N5_EXPERT',        '2019-01-01'),
    ('E00007', 2,  'N4_AVANCE',        '2020-06-01'),
    ('E00007', 27, 'N5_EXPERT',        '2019-01-01'),
    ('E00007', 13, 'N2_ELEMENTAIRE',   '2024-01-01'),
    ('E00007', 14, 'N1_DEBUTANT',      NULL),
    ('E00007', 15, 'N1_DEBUTANT',      NULL),
    -- E00008: Ines - Cybersecurite, gap en Cloud
    ('E00008', 10, 'N4_AVANCE',        '2021-06-01'),
    ('E00008', 11, 'N3_INTERMEDIAIRE', '2022-09-01'),
    ('E00008', 6,  'N3_INTERMEDIAIRE', '2023-01-01'),
    ('E00008', 19, 'N1_DEBUTANT',      NULL),
    -- E00009: Tarek - Web, gap en Microservices
    ('E00009', 6,  'N3_INTERMEDIAIRE', '2022-06-01'),
    ('E00009', 29, 'N3_INTERMEDIAIRE', '2022-09-01'),
    ('E00009', 18, 'N1_DEBUTANT',      NULL),
    ('E00009', 24, 'N2_ELEMENTAIRE',   '2023-06-01'),
    -- E00010: Nadia - Data Viz, gap en Spark
    ('E00010', 17, 'N4_AVANCE',        '2021-01-01'),
    ('E00010', 16, 'N1_DEBUTANT',      NULL),
    ('E00010', 30, 'N1_DEBUTANT',      NULL)
ON CONFLICT DO NOTHING;

-- ── Niveaux Savoir Requis ────────────────────────────────────────────────────
INSERT INTO niveau_savoir_requis (savoir_id, competence_id, sous_competence_id, niveau) VALUES
    (1,  1,  1,  'N4_AVANCE'),
    (2,  1,  1,  'N4_AVANCE'),
    (3,  1,  2,  'N3_INTERMEDIAIRE'),
    (27, 1,  1,  'N4_AVANCE'),
    (4,  2,  3,  'N4_AVANCE'),
    (5,  2,  3,  'N4_AVANCE'),
    (28, 2,  3,  'N4_AVANCE'),
    (6,  3,  4,  'N3_INTERMEDIAIRE'),
    (29, 3,  4,  'N3_INTERMEDIAIRE'),
    (7,  4,  5,  'N3_INTERMEDIAIRE'),
    (8,  5,  6,  'N4_AVANCE'),
    (9,  5,  7,  'N3_INTERMEDIAIRE'),
    (10, 6,  8,  'N4_AVANCE'),
    (11, 6,  9,  'N3_INTERMEDIAIRE'),
    (12, 7,  10, 'N4_AVANCE'),
    (13, 8,  11, 'N4_AVANCE'),
    (14, 8,  11, 'N3_INTERMEDIAIRE'),
    (15, 9,  12, 'N3_INTERMEDIAIRE'),
    (16, 10, 13, 'N4_AVANCE'),
    (17, 11, 14, 'N3_INTERMEDIAIRE'),
    (18, 12, 15, 'N3_INTERMEDIAIRE'),
    (19, 13, 16, 'N4_AVANCE'),
    (20, 14, 17, 'N3_INTERMEDIAIRE'),
    (21, 15, 18, 'N3_INTERMEDIAIRE'),
    (22, 16, 19, 'N3_INTERMEDIAIRE'),
    (23, 17, 20, 'N4_AVANCE'),
    (24, 18, NULL, 'N2_ELEMENTAIRE'),
    (25, 19, NULL, 'N2_ELEMENTAIRE'),
    (26, 20, NULL, 'N3_INTERMEDIAIRE'),
    (30, 20, NULL, 'N4_AVANCE')
ON CONFLICT DO NOTHING;

-- ── Formations (colonnes NOT NULL: titre_formation, date_debut, date_fin, etat_formation, certif_generated, inscriptions_ouvertes, ouverte) ──
INSERT INTO formations (titre_formation, date_debut, date_fin, etat_formation, certif_generated, inscriptions_ouvertes, ouverte, charge_horaire_global, type_formation, departement_id) VALUES
    ('Python Avance & Data Science',       '2025-09-01', '2025-11-30', 'PLANIFIE', false, true, true, 40, 'INTERNE', '1'),
    ('Deep Learning Fondamentaux',         '2025-10-01', '2025-12-15', 'PLANIFIE', false, true, true, 35, 'EXTERNE', '1'),
    ('Big Data Engineering avec Spark',    '2025-09-15', '2025-12-20', 'PLANIFIE', false, true, true, 50, 'INTERNE', '1'),
    ('DevOps & CI/CD avec Docker/K8s',     '2025-08-01', '2025-10-15', 'PLANIFIE', false, true, true, 30, 'INTERNE', '1'),
    ('Cybersecurite Avancee',              '2025-09-01', '2025-11-30', 'PLANIFIE', false, true, true, 40, 'EXTERNE', '2'),
    ('Cloud AWS/Azure Practitioner',       '2025-10-01', '2026-01-15', 'PLANIFIE', false, true, true, 45, 'EXTERNE', '1'),
    ('Architecture Microservices',         '2025-09-15', '2025-11-30', 'PLANIFIE', false, true, true, 35, 'INTERNE', '1'),
    ('IoT & Systemes Embarques',           '2025-10-01', '2025-12-20', 'PLANIFIE', false, true, true, 30, 'INTERNE', '3'),
    ('Agilite & Scrum Master',             '2025-08-15', '2025-09-30', 'EN_COURS', false, false, true, 20, 'INTERNE', '1'),
    ('Reseaux Avances & Securite',         '2025-09-01', '2025-11-15', 'PLANIFIE', false, true, true, 35, 'INTERNE', '2')
ON CONFLICT DO NOTHING;

-- ── Inscriptions ──────────────────────────────────────────────────────────────
INSERT INTO inscriptions (enseignant_id, formation_id, etat, date_demande) VALUES
    ('E00001', 1, 'APPROVED', '2025-07-01'),
    ('E00001', 3, 'APPROVED', '2025-07-15'),
    ('E00002', 5, 'APPROVED', '2025-07-10'),
    ('E00002', 6, 'PENDING',  '2025-08-01'),
    ('E00003', 8, 'APPROVED', '2025-07-20'),
    ('E00004', 4, 'APPROVED', '2025-07-05'),
    ('E00004', 7, 'PENDING',  '2025-08-10'),
    ('E00005', 9, 'APPROVED', '2025-07-25'),
    ('E00007', 1, 'APPROVED', '2025-07-01'),
    ('E00007', 2, 'PENDING',  '2025-08-05'),
    ('E00008', 5, 'APPROVED', '2025-07-15'),
    ('E00008', 6, 'PENDING',  '2025-08-01'),
    ('E00009', 7, 'PENDING',  '2025-08-10'),
    ('E00010', 3, 'APPROVED', '2025-07-20')
ON CONFLICT DO NOTHING;

-- ── Besoin Formation (colonnes NOT NULL: duree_formation, username) ──
INSERT INTO besoin_formation (titre, theme, priorite, duree_formation, username, approuve_admin, approuve_cup, last_refresh_date) VALUES
    ('Formation Big Data',          'Big Data',          'CRITIQUE', 50, 'E00001', true,  true,  '2025-06-01'),
    ('Formation Cloud AWS',         'Cloud Computing',   'HAUTE',    40, 'E00002', true,  false, '2025-06-15'),
    ('Formation IoT',              'IoT',               'HAUTE',    30, 'E00003', true,  true,  '2025-07-01'),
    ('Formation DevOps',           'DevOps',            'CRITIQUE', 35, 'E00004', true,  true,  '2025-05-20'),
    ('Formation Automatique',      'Automatique',       'MOYENNE',  25, 'E00005', false, false, '2025-07-10'),
    ('Formation Machine Learning', 'Machine Learning',  'HAUTE',    40, 'E00007', true,  true,  '2025-06-01'),
    ('Formation Microservices',    'Microservices',     'MOYENNE',  30, 'E00009', true,  false, '2025-07-15'),
    ('Formation Spark',            'Spark',             'HAUTE',    35, 'E00010', true,  true,  '2025-06-20'),
    ('Formation Deep Learning',    'Deep Learning',     'HAUTE',    40, 'E00007', false, false, '2025-08-01'),
    ('Formation Cybersecurite',    'Cybersecurite',     'CRITIQUE', 45, 'E00008', true,  true,  '2025-05-15')
ON CONFLICT DO NOTHING;

-- ── Competence Prerequisite ──────────────────────────────────────────────────
INSERT INTO competence_prerequisite (competence_id, prerequisite_id, niveau_minimum) VALUES
    (8,  1,  'N3_INTERMEDIAIRE'),
    (9,  8,  'N3_INTERMEDIAIRE'),
    (10, 8,  'N3_INTERMEDIAIRE'),
    (5,  2,  'N3_INTERMEDIAIRE'),
    (12, 2,  'N3_INTERMEDIAIRE'),
    (13, 5,  'N3_INTERMEDIAIRE'),
    (14, 1,  'N2_ELEMENTAIRE')
ON CONFLICT DO NOTHING;
