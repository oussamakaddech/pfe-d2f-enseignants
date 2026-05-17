-- =============================================================================
-- V5__seed_real_data.sql — Seed AUTONOME complet pour toutes les parties D2F
-- =============================================================================
-- Objectifs :
--   - Fournir un jeu de donnees riche et coherent couvrant TOUTES les tables
--     du domaine D2F (enseignants, organisation, competences/savoirs,
--      formations, inscriptions, presences, seances, besoins, evaluations,
--      certificats, prerequis).
--   - Atteindre >= 50 echantillons apres jointure pour entrainer le modele ML.
--   - Declencher tous les scenarios analytics (gaps critiques, stagnation,
--     regression, completion faible, besoins non couverts, tendance dept).
--
-- Compatibilite :
--   - Autonome : ne depend ni de V3 ni de V4.
--   - Respecte les contraintes Flyway/JPA actuelles :
--       * sous_competences.niveau (NOT NULL, INTEGER)
--       * savoirs.chk_savoir_single_parent (XOR competence_id / sous_competence_id)
--       * besoin_formation.event_published, duree_formation, nb_max_participants (NOT NULL)
--   - IDs explicites dans la plage 500-999 pour eviter toute collision avec
--     les sequences existantes ou les donnees Spring/JPA generees.
--
-- Idempotence : tous les INSERT utilisent ON CONFLICT DO NOTHING.
-- NE PAS executer en production.
-- =============================================================================

-- =============================================================================
-- 1. ORGANISATION : Departements & UPs (Unites Pedagogiques)
-- =============================================================================
INSERT INTO departements (id, libelle) VALUES
    ('D1', 'Informatique'),
    ('D2', 'Reseaux & Securite'),
    ('D3', 'Electronique & Embarque'),
    ('D4', 'Telecommunications'),
    ('D5', 'Genie Industriel')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ups (id, libelle) VALUES
    ('UP01', 'UP Informatique - Developpement Logiciel'),
    ('UP02', 'UP Informatique - Data & IA'),
    ('UP03', 'UP Reseaux & Securite'),
    ('UP04', 'UP Electronique & Embarque'),
    ('UP05', 'UP Telecom & Signal'),
    ('UP06', 'UP Methodes & Gestion')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. ENSEIGNANTS : 30 profils realistes repartis sur 5 departements
-- =============================================================================
INSERT INTO enseignants (id, chefdepartement, cup, etat, mail, nom, prenom, type, dept_id, up_id) VALUES
    -- Dept Informatique (12)
    ('E00001', 'N', 'N', 'A', 'mohamed.benahmed@esprit.tn',  'Ben Ahmed',   'Mohamed',  'P', 'D1', 'UP01'),
    ('E00002', 'N', 'N', 'A', 'fatma.trabelsi@esprit.tn',    'Trabelsi',    'Fatma',    'P', 'D1', 'UP01'),
    ('E00004', 'N', 'N', 'A', 'salma.hamdi@esprit.tn',       'Hamdi',       'Salma',    'P', 'D1', 'UP01'),
    ('E00007', 'N', 'N', 'A', 'youssef.khelifi@esprit.tn',   'Khelifi',     'Youssef',  'P', 'D1', 'UP02'),
    ('E00009', 'N', 'N', 'A', 'tarek.maalej@esprit.tn',      'Maalej',      'Tarek',    'V', 'D1', 'UP01'),
    ('E00012', 'N', 'N', 'A', 'leila.bensalem@esprit.tn',    'Ben Salem',   'Leila',    'P', 'D1', 'UP01'),
    ('E00014', 'N', 'N', 'A', 'amina.zouari@esprit.tn',      'Zouari',      'Amina',    'P', 'D1', 'UP01'),
    ('E00016', 'N', 'O', 'A', 'sonia.bouhmidi@esprit.tn',    'Bouhmidi',    'Sonia',    'P', 'D1', 'UP01'),
    ('E00017', 'O', 'N', 'A', 'walid.haddad@esprit.tn',      'Haddad',      'Walid',    'P', 'D1', 'UP02'),
    ('E00018', 'N', 'N', 'A', 'mariem.belhadj@esprit.tn',    'Belhadj',     'Mariem',   'P', 'D1', 'UP01'),
    ('E00019', 'N', 'N', 'A', 'aymen.bouabid@esprit.tn',     'Bouabid',     'Aymen',    'V', 'D1', 'UP01'),
    ('E00020', 'N', 'N', 'A', 'syrine.daoud@esprit.tn',      'Daoud',       'Syrine',   'P', 'D1', 'UP02'),
    -- Dept Reseaux & Securite (6)
    ('E00003', 'N', 'N', 'A', 'khaled.bouaziz@esprit.tn',    'Bouaziz',     'Khaled',   'P', 'D2', 'UP03'),
    ('E00008', 'N', 'N', 'A', 'ines.chaabane@esprit.tn',     'Chaabane',    'Ines',     'P', 'D2', 'UP03'),
    ('E00013', 'N', 'N', 'A', 'hassan.mbarek@esprit.tn',     'Mbarek',      'Hassan',   'V', 'D2', 'UP03'),
    ('E00021', 'O', 'N', 'A', 'wassim.kefi@esprit.tn',       'Kefi',        'Wassim',   'P', 'D2', 'UP03'),
    ('E00022', 'N', 'N', 'A', 'sirine.akrout@esprit.tn',     'Akrout',      'Sirine',   'P', 'D2', 'UP03'),
    ('E00023', 'N', 'N', 'A', 'malek.tounsi@esprit.tn',      'Tounsi',      'Malek',    'V', 'D2', 'UP03'),
    -- Dept Electronique (4)
    ('E00005', 'N', 'N', 'A', 'amine.jlassi@esprit.tn',      'Jlassi',      'Amine',    'P', 'D3', 'UP04'),
    ('E00010', 'N', 'N', 'A', 'nadia.gharbi@esprit.tn',      'Gharbi',      'Nadia',    'P', 'D3', 'UP04'),
    ('E00024', 'N', 'N', 'A', 'hela.brahim@esprit.tn',       'Brahim',      'Hela',     'P', 'D3', 'UP04'),
    ('E00025', 'N', 'N', 'A', 'mohamed.gharbi@esprit.tn',    'Gharbi',      'Mohamed',  'P', 'D3', 'UP04'),
    -- Dept Telecom (4)
    ('E00006', 'N', 'N', 'A', 'rim.mansour@esprit.tn',       'Mansour',     'Rim',      'P', 'D4', 'UP05'),
    ('E00011', 'N', 'N', 'A', 'omar.saidi@esprit.tn',        'Saidi',       'Omar',     'P', 'D4', 'UP05'),
    ('E00026', 'O', 'N', 'A', 'amel.ferchichi@esprit.tn',    'Ferchichi',   'Amel',     'P', 'D4', 'UP05'),
    ('E00027', 'N', 'N', 'A', 'ridha.lamine@esprit.tn',      'Lamine',      'Ridha',    'P', 'D4', 'UP05'),
    -- Dept Genie Industriel (3)
    ('E00015', 'N', 'N', 'A', 'sami.riahi@esprit.tn',        'Riahi',       'Sami',     'P', 'D5', 'UP06'),
    ('E00028', 'O', 'N', 'A', 'najla.ouali@esprit.tn',       'Ouali',       'Najla',    'P', 'D5', 'UP06'),
    ('E00029', 'N', 'N', 'A', 'imen.bensaid@esprit.tn',      'Ben Said',    'Imen',     'P', 'D5', 'UP06')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. DOMAINES (IDs 500-508)
-- =============================================================================
INSERT INTO domaines (id, actif, code, nom, description, created_by, updated_by, version) VALUES
    (501, true, 'D-INFO', 'Informatique',              'Developpement logiciel et programmation', 'seed_v5', 'seed_v5', 0),
    (502, true, 'D-GLOG', 'Genie Logiciel',            'Methodes et qualite logicielle',           'seed_v5', 'seed_v5', 0),
    (503, true, 'D-NET',  'Reseaux & Securite',        'Reseaux et cybersecurite',                 'seed_v5', 'seed_v5', 0),
    (504, true, 'D-IA',   'Intelligence Artificielle', 'IA et Machine Learning',                   'seed_v5', 'seed_v5', 0),
    (505, true, 'D-DATA', 'Data Science',              'Science des donnees et Big Data',          'seed_v5', 'seed_v5', 0),
    (506, true, 'D-ELEC', 'Electronique',              'Electronique et systemes embarques',       'seed_v5', 'seed_v5', 0),
    (507, true, 'D-TELC', 'Telecommunications',        'Telecoms et traitement du signal',         'seed_v5', 'seed_v5', 0),
    (508, true, 'D-AGIL', 'Methodes & Agilite',        'Agilite et gestion de projet',             'seed_v5', 'seed_v5', 0)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. COMPETENCES (IDs 501-525)
-- =============================================================================
INSERT INTO competences (id, code, nom, domaine_id, description, created_by, updated_by, version) VALUES
    (501, 'C-PYTH',  'Programmation Python',          501, 'Python avance et frameworks',           'seed_v5', 'seed_v5', 0),
    (502, 'C-JAVA',  'Programmation Java',            501, 'Java et Spring Boot',                    'seed_v5', 'seed_v5', 0),
    (503, 'C-WEB',   'Developpement Web',             502, 'Frontend et backend',                    'seed_v5', 'seed_v5', 0),
    (504, 'C-BDD',   'Bases de Donnees',              501, 'SQL et NoSQL',                           'seed_v5', 'seed_v5', 0),
    (505, 'C-DEVOPS','DevOps & CI/CD',                502, 'Docker, K8s, CI/CD pipelines',            'seed_v5', 'seed_v5', 0),
    (506, 'C-SEC',   'Cybersecurite',                 503, 'Securite informatique',                  'seed_v5', 'seed_v5', 0),
    (507, 'C-NET',   'Reseaux TCP/IP',                503, 'Administration reseaux',                 'seed_v5', 'seed_v5', 0),
    (508, 'C-ML',    'Machine Learning',              504, 'Apprentissage automatique',              'seed_v5', 'seed_v5', 0),
    (509, 'C-DL',    'Deep Learning',                 504, 'Reseaux de neurones profonds',           'seed_v5', 'seed_v5', 0),
    (510, 'C-SPARK', 'Big Data & Spark',              505, 'Traitement de donnees massives',         'seed_v5', 'seed_v5', 0),
    (511, 'C-DVIZ',  'Data Visualization',            505, 'Visualisation et reporting',             'seed_v5', 'seed_v5', 0),
    (512, 'C-MICRO', 'Architecture Microservices',    502, 'Conception microservices',               'seed_v5', 'seed_v5', 0),
    (513, 'C-CLOUD', 'Cloud Computing',               501, 'AWS, Azure, GCP',                        'seed_v5', 'seed_v5', 0),
    (514, 'C-IOT',   'IoT & Systemes Embarques',      506, 'Internet des objets',                    'seed_v5', 'seed_v5', 0),
    (515, 'C-AUTO',  'Automatique',                   506, 'Controle et regulation',                 'seed_v5', 'seed_v5', 0),
    (516, 'C-SIG',   'Signal Processing',             506, 'Traitement du signal',                   'seed_v5', 'seed_v5', 0),
    (517, 'C-MOB',   'Communications Mobiles',        507, '4G/5G et protocoles mobiles',            'seed_v5', 'seed_v5', 0),
    (518, 'C-AGIL',  'Agilite & Scrum',               508, 'Methodes agiles',                        'seed_v5', 'seed_v5', 0),
    (519, 'C-TEST',  'Tests & Qualite',               502, 'Assurance qualite logicielle',           'seed_v5', 'seed_v5', 0),
    (520, 'C-DIST',  'Systemes Distribues',           501, 'Architecture distribuee',                'seed_v5', 'seed_v5', 0),
    (521, 'C-NLP',   'NLP & LLM',                     504, 'Traitement du langage et LLM',           'seed_v5', 'seed_v5', 0),
    (522, 'C-PTST',  'Pentest & Ethical Hacking',     503, 'Tests d intrusion',                      'seed_v5', 'seed_v5', 0),
    (523, 'C-TDD',   'TDD & Clean Code',              502, 'Test Driven Development',                'seed_v5', 'seed_v5', 0),
    (524, 'C-GQL',   'GraphQL & Apollo',              501, 'API GraphQL',                            'seed_v5', 'seed_v5', 0),
    (525, 'C-MLOPS', 'MLOps & Kubeflow',              505, 'Mise en production de modeles ML',       'seed_v5', 'seed_v5', 0)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 5. SOUS-COMPETENCES (IDs 501-525) avec niveau NOT NULL
-- =============================================================================
INSERT INTO sous_competences (id, code, nom, competence_id, niveau, created_by, updated_by, version) VALUES
    (501, 'SC-PYSYN', 'Syntaxe & Bibliotheques Python', 501, 3, 'seed_v5', 'seed_v5', 0),
    (502, 'SC-PYOO',  'OOP Python',                     501, 3, 'seed_v5', 'seed_v5', 0),
    (503, 'SC-SPRG',  'Spring Boot',                    502, 3, 'seed_v5', 'seed_v5', 0),
    (504, 'SC-REACT', 'React.js',                       503, 3, 'seed_v5', 'seed_v5', 0),
    (505, 'SC-PG',    'PostgreSQL',                     504, 3, 'seed_v5', 'seed_v5', 0),
    (506, 'SC-DOC',   'Docker',                         505, 3, 'seed_v5', 'seed_v5', 0),
    (507, 'SC-K8S',   'Kubernetes',                     505, 4, 'seed_v5', 'seed_v5', 0),
    (508, 'SC-PNTST', 'Penetration Testing',            506, 4, 'seed_v5', 'seed_v5', 0),
    (509, 'SC-FIRE',  'Firewall & IDS',                 506, 3, 'seed_v5', 'seed_v5', 0),
    (510, 'SC-RS',    'Routing & Switching',            507, 4, 'seed_v5', 'seed_v5', 0),
    (511, 'SC-SKL',   'Scikit-learn',                   508, 3, 'seed_v5', 'seed_v5', 0),
    (512, 'SC-TF',    'TensorFlow',                     509, 3, 'seed_v5', 'seed_v5', 0),
    (513, 'SC-SPK',   'Apache Spark',                   510, 4, 'seed_v5', 'seed_v5', 0),
    (514, 'SC-PBI',   'Power BI',                       511, 3, 'seed_v5', 'seed_v5', 0),
    (515, 'SC-GTW',   'API Gateway',                    512, 3, 'seed_v5', 'seed_v5', 0),
    (516, 'SC-AWS',   'AWS / Azure',                    513, 4, 'seed_v5', 'seed_v5', 0),
    (517, 'SC-ARD',   'Arduino / RPi',                  514, 3, 'seed_v5', 'seed_v5', 0),
    (518, 'SC-PID',   'PID Control',                    515, 3, 'seed_v5', 'seed_v5', 0),
    (519, 'SC-DSP',   'DSP / FFT',                      516, 3, 'seed_v5', 'seed_v5', 0),
    (520, 'SC-5G',    '5G Protocols',                   517, 4, 'seed_v5', 'seed_v5', 0),
    (521, 'SC-BERT',  'Transformers / BERT',            521, 4, 'seed_v5', 'seed_v5', 0),
    (522, 'SC-OWASP', 'OWASP Pentest',                  522, 4, 'seed_v5', 'seed_v5', 0),
    (523, 'SC-TPYR',  'Test Pyramid',                   523, 3, 'seed_v5', 'seed_v5', 0),
    (524, 'SC-GQLS',  'Schema GraphQL',                 524, 3, 'seed_v5', 'seed_v5', 0),
    (525, 'SC-MLFL',  'MLflow & Kubeflow',              525, 4, 'seed_v5', 'seed_v5', 0)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 6. SAVOIRS (IDs 501-545) — un seul parent (sous_competence_id OU competence_id)
-- =============================================================================
INSERT INTO savoirs (id, code, nom, type, sous_competence_id, niveau, created_by, version) VALUES
    (501, 'SV-VAR',    'Variables & Types Python',     'THEORIQUE', 501, 'N2_ELEMENTAIRE',    'seed_v5', 0),
    (502, 'SV-FUNC',   'Fonctions & Modules',          'THEORIQUE', 501, 'N2_ELEMENTAIRE',    'seed_v5', 0),
    (503, 'SV-CLASS',  'Classes & Heritage Python',    'THEORIQUE', 502, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (504, 'SV-PNDS',   'Pandas & NumPy',               'PRATIQUE',  501, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (505, 'SV-SPGAN',  'Annotations Spring',           'THEORIQUE', 503, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (506, 'SV-REST',   'REST Controllers',             'PRATIQUE',  503, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (507, 'SV-JPA',    'JPA / Hibernate',              'PRATIQUE',  503, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (508, 'SV-CMPNT',  'Components React',             'PRATIQUE',  504, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (509, 'SV-REDUX',  'State Management (Redux)',     'PRATIQUE',  504, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (510, 'SV-SQL',    'SQL Avance',                   'PRATIQUE',  505, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (511, 'SV-DCKF',   'Dockerfile',                   'PRATIQUE',  506, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (512, 'SV-HELM',   'Helm Charts',                  'PRATIQUE',  507, 'N4_AVANCE',         'seed_v5', 0),
    (513, 'SV-OWASP',  'OWASP Top 10',                 'THEORIQUE', 508, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (514, 'SV-IPTBL',  'iptables / nftables',          'PRATIQUE',  509, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (515, 'SV-OSPF',   'OSPF / BGP',                   'THEORIQUE', 510, 'N4_AVANCE',         'seed_v5', 0),
    (516, 'SV-REGL',   'Regression Lineaire',          'THEORIQUE', 511, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (517, 'SV-RF',     'Random Forest',                'THEORIQUE', 511, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (518, 'SV-CNN',    'CNN & Transfer Learning',      'THEORIQUE', 512, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (519, 'SV-MR',     'MapReduce',                    'THEORIQUE', 513, 'N4_AVANCE',         'seed_v5', 0),
    (520, 'SV-DAX',    'DAX Formules',                 'PRATIQUE',  514, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (521, 'SV-RTLIM',  'Rate Limiting',                'PRATIQUE',  515, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (522, 'SV-EC2',    'EC2 / S3 / Lambda',            'PRATIQUE',  516, 'N4_AVANCE',         'seed_v5', 0),
    (523, 'SV-GPIO',   'GPIO Programming',             'PRATIQUE',  517, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (524, 'SV-ZTR',    'Z-Transform',                  'THEORIQUE', 518, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (525, 'SV-FFT',    'FFT Implementation',           'PRATIQUE',  519, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (526, 'SV-NR',     'NR Air Interface',             'THEORIQUE', 520, 'N4_AVANCE',         'seed_v5', 0),
    (527, 'SV-BERT',   'Embeddings & BERT',            'THEORIQUE', 521, 'N4_AVANCE',         'seed_v5', 0),
    (528, 'SV-LLM',    'Fine-tuning LLM',              'PRATIQUE',  521, 'N4_AVANCE',         'seed_v5', 0),
    (529, 'SV-MSPL',   'Metasploit',                   'PRATIQUE',  522, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (530, 'SV-BURP',   'BurpSuite',                    'PRATIQUE',  522, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (531, 'SV-REFA',   'Refactoring Patterns',         'THEORIQUE', 523, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (532, 'SV-JUNIT',  'JUnit & Mockito',              'PRATIQUE',  523, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (533, 'SV-GQLR',   'GraphQL Resolvers',            'PRATIQUE',  524, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (534, 'SV-MREG',   'Model Registry',               'PRATIQUE',  525, 'N4_AVANCE',         'seed_v5', 0),
    (535, 'SV-MLPIP',  'CI/CD ML Pipeline',            'PRATIQUE',  525, 'N4_AVANCE',         'seed_v5', 0)
ON CONFLICT (id) DO NOTHING;

-- Quelques savoirs directement attaches a une competence (sans sous_competence)
INSERT INTO savoirs (id, code, nom, type, competence_id, niveau, created_by, version) VALUES
    (540, 'SV-GIT',    'Git & GitHub',                 'PRATIQUE',  518, 'N2_ELEMENTAIRE',    'seed_v5', 0),
    (541, 'SV-SCRM',   'Scrum Framework',              'THEORIQUE', 518, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (542, 'SV-CAP',    'CAP Theorem',                  'THEORIQUE', 520, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (543, 'SV-KFK',    'Kafka Streams',                'PRATIQUE',  520, 'N4_AVANCE',         'seed_v5', 0),
    (544, 'SV-VUE',    'Vue.js',                       'PRATIQUE',  503, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (545, 'SV-SAGA',   'Saga Pattern',                 'THEORIQUE', 512, 'N4_AVANCE',         'seed_v5', 0)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 7. NIVEAU_SAVOIR_REQUIS : niveaux attendus pour chaque savoir
-- =============================================================================
INSERT INTO niveau_savoir_requis (savoir_id, competence_id, sous_competence_id, niveau, created_by, version) VALUES
    (501, 501, 501, 'N4_AVANCE',         'seed_v5', 0),
    (502, 501, 501, 'N4_AVANCE',         'seed_v5', 0),
    (503, 501, 502, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (504, 501, 501, 'N4_AVANCE',         'seed_v5', 0),
    (505, 502, 503, 'N4_AVANCE',         'seed_v5', 0),
    (506, 502, 503, 'N4_AVANCE',         'seed_v5', 0),
    (507, 502, 503, 'N4_AVANCE',         'seed_v5', 0),
    (508, 503, 504, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (509, 503, 504, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (510, 504, 505, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (511, 505, 506, 'N4_AVANCE',         'seed_v5', 0),
    (512, 505, 507, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (513, 506, 508, 'N4_AVANCE',         'seed_v5', 0),
    (514, 506, 509, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (515, 507, 510, 'N4_AVANCE',         'seed_v5', 0),
    (516, 508, 511, 'N4_AVANCE',         'seed_v5', 0),
    (517, 508, 511, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (518, 509, 512, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (519, 510, 513, 'N4_AVANCE',         'seed_v5', 0),
    (520, 511, 514, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (521, 512, 515, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (522, 513, 516, 'N4_AVANCE',         'seed_v5', 0),
    (523, 514, 517, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (524, 515, 518, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (525, 516, 519, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (526, 517, 520, 'N4_AVANCE',         'seed_v5', 0),
    (527, 521, 521, 'N4_AVANCE',         'seed_v5', 0),
    (528, 521, 521, 'N4_AVANCE',         'seed_v5', 0),
    (529, 522, 522, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (530, 522, 522, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (531, 523, 523, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (532, 523, 523, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (533, 524, 524, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (534, 525, 525, 'N4_AVANCE',         'seed_v5', 0),
    (535, 525, 525, 'N4_AVANCE',         'seed_v5', 0),
    (540, 518, NULL, 'N2_ELEMENTAIRE',    'seed_v5', 0),
    (541, 518, NULL, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (542, 520, NULL, 'N3_INTERMEDIAIRE',  'seed_v5', 0),
    (543, 520, NULL, 'N4_AVANCE',         'seed_v5', 0)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 8. ENSEIGNANT_COMPETENCES : matrice dense (>100 lignes) generant tous les
--    scenarios analytics (gaps CRITIQUE/HAUTE/MODEREE/FAIBLE, stagnation)
-- =============================================================================
INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, created_by, version) VALUES
    -- E00001 Mohamed (Info P) - Bon Python, gap Big Data
    ('E00001', 501, 'N4_AVANCE',        '2022-09-01', 'seed_v5', 0),
    ('E00001', 502, 'N4_AVANCE',        '2022-09-01', 'seed_v5', 0),
    ('E00001', 503, 'N3_INTERMEDIAIRE', '2023-03-01', 'seed_v5', 0),
    ('E00001', 504, 'N4_AVANCE',        '2022-09-01', 'seed_v5', 0),
    ('E00001', 516, 'N3_INTERMEDIAIRE', '2023-06-01', 'seed_v5', 0),
    ('E00001', 517, 'N2_ELEMENTAIRE',   '2023-09-01', 'seed_v5', 0),
    ('E00001', 519, 'N1_DEBUTANT',      '2024-01-15', 'seed_v5', 0),
    ('E00001', 511, 'N2_ELEMENTAIRE',   '2024-01-15', 'seed_v5', 0),
    ('E00001', 542, 'N1_DEBUTANT',      '2024-02-01', 'seed_v5', 0),
    -- E00002 Fatma (Info P) - Reseaux experte, gap Cloud
    ('E00002', 515, 'N5_EXPERT',        '2020-01-01', 'seed_v5', 0),
    ('E00002', 513, 'N4_AVANCE',        '2021-06-01', 'seed_v5', 0),
    ('E00002', 514, 'N4_AVANCE',        '2021-09-01', 'seed_v5', 0),
    ('E00002', 510, 'N3_INTERMEDIAIRE', '2023-01-01', 'seed_v5', 0),
    ('E00002', 522, 'N1_DEBUTANT',      '2024-02-01', 'seed_v5', 0),
    ('E00002', 511, 'N2_ELEMENTAIRE',   '2024-02-01', 'seed_v5', 0),
    -- E00003 Khaled (Reseaux P) - Electronique, gap IoT
    ('E00003', 524, 'N4_AVANCE',        '2021-01-01', 'seed_v5', 0),
    ('E00003', 525, 'N3_INTERMEDIAIRE', '2022-06-01', 'seed_v5', 0),
    ('E00003', 523, 'N2_ELEMENTAIRE',   '2023-03-01', 'seed_v5', 0),
    ('E00003', 520, 'N1_DEBUTANT',      '2024-01-01', 'seed_v5', 0),
    -- E00004 Salma (Info P) - Java/Spring, gap DevOps (CRITIQUE)
    ('E00004', 505, 'N4_AVANCE',        '2021-09-01', 'seed_v5', 0),
    ('E00004', 506, 'N3_INTERMEDIAIRE', '2022-06-01', 'seed_v5', 0),
    ('E00004', 507, 'N4_AVANCE',        '2021-09-01', 'seed_v5', 0),
    ('E00004', 511, 'N1_DEBUTANT',      '2024-02-01', 'seed_v5', 0),
    ('E00004', 512, 'N1_DEBUTANT',      '2024-02-01', 'seed_v5', 0),
    ('E00004', 532, 'N2_ELEMENTAIRE',   '2023-09-01', 'seed_v5', 0),
    -- E00005 Amine (Elec P) - Mecanique
    ('E00005', 524, 'N2_ELEMENTAIRE',   '2023-01-01', 'seed_v5', 0),
    ('E00005', 521, 'N1_DEBUTANT',      '2024-01-01', 'seed_v5', 0),
    -- E00006 Rim (Telecom P) - Bon profil signal/telecom
    ('E00006', 526, 'N4_AVANCE',        '2021-01-01', 'seed_v5', 0),
    ('E00006', 525, 'N3_INTERMEDIAIRE', '2022-06-01', 'seed_v5', 0),
    ('E00006', 519, 'N3_INTERMEDIAIRE', '2022-09-01', 'seed_v5', 0),
    -- E00007 Youssef (Info P) - Python expert, gap ML
    ('E00007', 501, 'N5_EXPERT',        '2019-01-01', 'seed_v5', 0),
    ('E00007', 502, 'N4_AVANCE',        '2020-06-01', 'seed_v5', 0),
    ('E00007', 504, 'N5_EXPERT',        '2019-01-01', 'seed_v5', 0),
    ('E00007', 516, 'N2_ELEMENTAIRE',   '2024-01-01', 'seed_v5', 0),
    ('E00007', 517, 'N1_DEBUTANT',      '2024-01-15', 'seed_v5', 0),
    ('E00007', 518, 'N1_DEBUTANT',      '2024-02-01', 'seed_v5', 0),
    -- E00008 Ines (Securite P) - Bonne couverture, gap Cloud
    ('E00008', 513, 'N4_AVANCE',        '2021-06-01', 'seed_v5', 0),
    ('E00008', 514, 'N3_INTERMEDIAIRE', '2022-09-01', 'seed_v5', 0),
    ('E00008', 511, 'N3_INTERMEDIAIRE', '2023-01-01', 'seed_v5', 0),
    ('E00008', 522, 'N1_DEBUTANT',      '2024-01-01', 'seed_v5', 0),
    -- E00009 Tarek (Info V) - Web, gap Microservices
    ('E00009', 508, 'N3_INTERMEDIAIRE', '2022-06-01', 'seed_v5', 0),
    ('E00009', 509, 'N3_INTERMEDIAIRE', '2022-09-01', 'seed_v5', 0),
    ('E00009', 521, 'N1_DEBUTANT',      '2024-01-01', 'seed_v5', 0),
    ('E00009', 540, 'N2_ELEMENTAIRE',   '2023-06-01', 'seed_v5', 0),
    -- E00010 Nadia (Elec P) - Data Viz, gap Spark
    ('E00010', 520, 'N4_AVANCE',        '2021-01-01', 'seed_v5', 0),
    ('E00010', 519, 'N1_DEBUTANT',      '2024-01-01', 'seed_v5', 0),
    ('E00010', 543, 'N1_DEBUTANT',      '2024-02-01', 'seed_v5', 0),
    -- E00011 Omar (Telecom P) - Couverture moyenne
    ('E00011', 526, 'N3_INTERMEDIAIRE', '2022-01-01', 'seed_v5', 0),
    ('E00011', 525, 'N2_ELEMENTAIRE',   '2023-06-01', 'seed_v5', 0),
    ('E00011', 520, 'N2_ELEMENTAIRE',   '2024-02-01', 'seed_v5', 0),
    ('E00011', 501, 'N2_ELEMENTAIRE',   '2024-01-15', 'seed_v5', 0),
    -- E00012 Leila (Info P) - Profil senior tres bon
    ('E00012', 501, 'N5_EXPERT',        '2019-01-01', 'seed_v5', 0),
    ('E00012', 502, 'N4_AVANCE',        '2020-03-01', 'seed_v5', 0),
    ('E00012', 505, 'N4_AVANCE',        '2020-09-01', 'seed_v5', 0),
    ('E00012', 506, 'N4_AVANCE',        '2020-09-01', 'seed_v5', 0),
    ('E00012', 510, 'N4_AVANCE',        '2021-01-01', 'seed_v5', 0),
    ('E00012', 511, 'N3_INTERMEDIAIRE', '2022-06-01', 'seed_v5', 0),
    ('E00012', 532, 'N4_AVANCE',        '2021-09-01', 'seed_v5', 0),
    ('E00012', 507, 'N4_AVANCE',        '2020-06-01', 'seed_v5', 0),
    -- E00013 Hassan (Securite V) - Gap profond Cloud/IA
    ('E00013', 513, 'N3_INTERMEDIAIRE', '2022-09-01', 'seed_v5', 0),
    ('E00013', 514, 'N3_INTERMEDIAIRE', '2023-01-01', 'seed_v5', 0),
    ('E00013', 515, 'N2_ELEMENTAIRE',   '2023-09-01', 'seed_v5', 0),
    ('E00013', 522, 'N1_DEBUTANT',      '2024-01-01', 'seed_v5', 0),
    ('E00013', 516, 'N1_DEBUTANT',      '2024-02-01', 'seed_v5', 0),
    -- E00014 Amina (Info P) - Profil intermediaire
    ('E00014', 501, 'N3_INTERMEDIAIRE', '2022-06-01', 'seed_v5', 0),
    ('E00014', 502, 'N3_INTERMEDIAIRE', '2022-06-01', 'seed_v5', 0),
    ('E00014', 503, 'N3_INTERMEDIAIRE', '2023-01-01', 'seed_v5', 0),
    ('E00014', 504, 'N3_INTERMEDIAIRE', '2023-01-01', 'seed_v5', 0),
    ('E00014', 516, 'N2_ELEMENTAIRE',   '2024-01-01', 'seed_v5', 0),
    ('E00014', 517, 'N1_DEBUTANT',      '2024-02-01', 'seed_v5', 0),
    ('E00014', 510, 'N3_INTERMEDIAIRE', '2023-06-01', 'seed_v5', 0),
    ('E00014', 511, 'N2_ELEMENTAIRE',   '2024-03-01', 'seed_v5', 0),
    -- E00015 Sami (GI P) - Gap massif logiciel
    ('E00015', 524, 'N4_AVANCE',        '2021-01-01', 'seed_v5', 0),
    ('E00015', 525, 'N4_AVANCE',        '2021-06-01', 'seed_v5', 0),
    ('E00015', 523, 'N3_INTERMEDIAIRE', '2022-09-01', 'seed_v5', 0),
    ('E00015', 501, 'N1_DEBUTANT',      '2024-01-01', 'seed_v5', 0),
    -- E00016 Sonia (Info P, CUP) - Tres bon profil
    ('E00016', 501, 'N5_EXPERT',        '2018-09-01', 'seed_v5', 0),
    ('E00016', 502, 'N4_AVANCE',        '2019-06-01', 'seed_v5', 0),
    ('E00016', 504, 'N5_EXPERT',        '2018-09-01', 'seed_v5', 0),
    ('E00016', 505, 'N5_EXPERT',        '2019-01-01', 'seed_v5', 0),
    ('E00016', 506, 'N4_AVANCE',        '2019-06-01', 'seed_v5', 0),
    ('E00016', 507, 'N4_AVANCE',        '2019-06-01', 'seed_v5', 0),
    ('E00016', 522, 'N3_INTERMEDIAIRE', '2022-01-01', 'seed_v5', 0),
    ('E00016', 511, 'N4_AVANCE',        '2021-06-01', 'seed_v5', 0),
    ('E00016', 512, 'N3_INTERMEDIAIRE', '2022-09-01', 'seed_v5', 0),
    -- E00017 Walid (Info P, Chef Dept) - Data expert, gap MLOps
    ('E00017', 516, 'N5_EXPERT',        '2018-01-01', 'seed_v5', 0),
    ('E00017', 517, 'N5_EXPERT',        '2018-06-01', 'seed_v5', 0),
    ('E00017', 518, 'N4_AVANCE',        '2019-09-01', 'seed_v5', 0),
    ('E00017', 519, 'N4_AVANCE',        '2020-01-01', 'seed_v5', 0),
    ('E00017', 504, 'N5_EXPERT',        '2018-01-01', 'seed_v5', 0),
    ('E00017', 501, 'N5_EXPERT',        '2017-01-01', 'seed_v5', 0),
    ('E00017', 527, 'N2_ELEMENTAIRE',   '2024-06-01', 'seed_v5', 0),
    ('E00017', 528, 'N1_DEBUTANT',      '2024-09-01', 'seed_v5', 0),
    ('E00017', 534, 'N1_DEBUTANT',      '2024-10-01', 'seed_v5', 0),
    ('E00017', 535, 'N1_DEBUTANT',      '2024-10-01', 'seed_v5', 0),
    -- E00018 Mariem (Info P) - Frontend, gap backend
    ('E00018', 508, 'N4_AVANCE',        '2021-01-01', 'seed_v5', 0),
    ('E00018', 509, 'N4_AVANCE',        '2021-06-01', 'seed_v5', 0),
    ('E00018', 544, 'N3_INTERMEDIAIRE', '2023-01-01', 'seed_v5', 0),
    ('E00018', 505, 'N1_DEBUTANT',      '2024-01-01', 'seed_v5', 0),
    ('E00018', 506, 'N1_DEBUTANT',      '2024-01-01', 'seed_v5', 0),
    ('E00018', 540, 'N3_INTERMEDIAIRE', '2022-06-01', 'seed_v5', 0),
    -- E00019 Aymen (Info V) - Junior
    ('E00019', 501, 'N2_ELEMENTAIRE',   '2024-09-01', 'seed_v5', 0),
    ('E00019', 540, 'N2_ELEMENTAIRE',   '2024-09-01', 'seed_v5', 0),
    ('E00019', 541, 'N1_DEBUTANT',      '2024-10-01', 'seed_v5', 0),
    -- E00020 Syrine (Info P, Data) - DL niche
    ('E00020', 518, 'N4_AVANCE',        '2020-09-01', 'seed_v5', 0),
    ('E00020', 517, 'N3_INTERMEDIAIRE', '2021-06-01', 'seed_v5', 0),
    ('E00020', 516, 'N3_INTERMEDIAIRE', '2021-06-01', 'seed_v5', 0),
    ('E00020', 527, 'N3_INTERMEDIAIRE', '2023-06-01', 'seed_v5', 0),
    ('E00020', 528, 'N2_ELEMENTAIRE',   '2024-01-01', 'seed_v5', 0),
    ('E00020', 504, 'N4_AVANCE',        '2020-01-01', 'seed_v5', 0),
    -- E00021 Wassim (Securite P, Chef Dept) - Pentest expert
    ('E00021', 513, 'N5_EXPERT',        '2017-01-01', 'seed_v5', 0),
    ('E00021', 514, 'N5_EXPERT',        '2017-06-01', 'seed_v5', 0),
    ('E00021', 529, 'N4_AVANCE',        '2019-01-01', 'seed_v5', 0),
    ('E00021', 530, 'N4_AVANCE',        '2019-06-01', 'seed_v5', 0),
    ('E00021', 515, 'N3_INTERMEDIAIRE', '2022-01-01', 'seed_v5', 0),
    ('E00021', 511, 'N2_ELEMENTAIRE',   '2024-02-01', 'seed_v5', 0),
    -- E00022 Sirine (Securite P) - Couverture moyenne
    ('E00022', 513, 'N3_INTERMEDIAIRE', '2022-09-01', 'seed_v5', 0),
    ('E00022', 514, 'N3_INTERMEDIAIRE', '2022-09-01', 'seed_v5', 0),
    ('E00022', 522, 'N1_DEBUTANT',      '2024-01-01', 'seed_v5', 0),
    ('E00022', 530, 'N2_ELEMENTAIRE',   '2024-03-01', 'seed_v5', 0),
    -- E00023 Malek (Securite V) - Junior pentest
    ('E00023', 513, 'N2_ELEMENTAIRE',   '2023-09-01', 'seed_v5', 0),
    ('E00023', 529, 'N1_DEBUTANT',      '2024-01-01', 'seed_v5', 0),
    -- E00024 Hela (Elec P) - IoT + Signal
    ('E00024', 523, 'N4_AVANCE',        '2021-01-01', 'seed_v5', 0),
    ('E00024', 520, 'N4_AVANCE',        '2021-06-01', 'seed_v5', 0),
    ('E00024', 524, 'N3_INTERMEDIAIRE', '2022-09-01', 'seed_v5', 0),
    ('E00024', 525, 'N3_INTERMEDIAIRE', '2022-09-01', 'seed_v5', 0),
    ('E00024', 501, 'N2_ELEMENTAIRE',   '2024-01-01', 'seed_v5', 0),
    -- E00025 Mohamed Gharbi (Elec P) - Automatique + Signal
    ('E00025', 524, 'N4_AVANCE',        '2020-09-01', 'seed_v5', 0),
    ('E00025', 521, 'N4_AVANCE',        '2021-01-01', 'seed_v5', 0),
    ('E00025', 525, 'N3_INTERMEDIAIRE', '2022-01-01', 'seed_v5', 0),
    ('E00025', 501, 'N1_DEBUTANT',      '2024-01-01', 'seed_v5', 0),
    -- E00026 Amel (Telecom P, Chef Dept) - 5G expert
    ('E00026', 526, 'N5_EXPERT',        '2018-01-01', 'seed_v5', 0),
    ('E00026', 525, 'N4_AVANCE',        '2020-06-01', 'seed_v5', 0),
    ('E00026', 519, 'N4_AVANCE',        '2020-09-01', 'seed_v5', 0),
    ('E00026', 501, 'N2_ELEMENTAIRE',   '2024-01-01', 'seed_v5', 0),
    -- E00027 Ridha (Telecom P) - Couverture moyenne
    ('E00027', 526, 'N3_INTERMEDIAIRE', '2022-09-01', 'seed_v5', 0),
    ('E00027', 525, 'N3_INTERMEDIAIRE', '2022-09-01', 'seed_v5', 0),
    ('E00027', 519, 'N2_ELEMENTAIRE',   '2023-09-01', 'seed_v5', 0),
    -- E00028 Najla (GI P, Chef Dept) - Agilite + Scrum
    ('E00028', 540, 'N4_AVANCE',        '2021-01-01', 'seed_v5', 0),
    ('E00028', 541, 'N3_INTERMEDIAIRE', '2022-09-01', 'seed_v5', 0),
    ('E00028', 531, 'N2_ELEMENTAIRE',   '2024-03-01', 'seed_v5', 0),
    -- E00029 Imen (GI P) - Debutante - candidate plan formation
    ('E00029', 540, 'N2_ELEMENTAIRE',   '2024-06-01', 'seed_v5', 0),
    ('E00029', 501, 'N1_DEBUTANT',      '2024-09-01', 'seed_v5', 0)
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;

-- =============================================================================
-- 9. COMPETENCE_PREREQUISITE : graphe de dependances
-- =============================================================================
INSERT INTO competence_prerequisite (competence_id, prerequisite_id, niveau_minimum) VALUES
    (508, 501, 'N3_INTERMEDIAIRE'),  -- ML requires Python
    (509, 508, 'N3_INTERMEDIAIRE'),  -- DL requires ML
    (510, 508, 'N3_INTERMEDIAIRE'),  -- Spark requires ML
    (505, 502, 'N3_INTERMEDIAIRE'),  -- DevOps requires Java
    (512, 502, 'N3_INTERMEDIAIRE'),  -- Microservices requires Java
    (513, 505, 'N3_INTERMEDIAIRE'),  -- Cloud requires DevOps
    (514, 501, 'N2_ELEMENTAIRE'),    -- IoT requires Python
    (521, 508, 'N3_INTERMEDIAIRE'),  -- NLP requires ML
    (521, 509, 'N3_INTERMEDIAIRE'),  -- NLP requires DL
    (522, 506, 'N3_INTERMEDIAIRE'),  -- Pentest requires Cybersec
    (523, 502, 'N2_ELEMENTAIRE'),    -- TDD requires Java
    (523, 519, 'N2_ELEMENTAIRE'),    -- TDD requires Tests
    (524, 503, 'N3_INTERMEDIAIRE'),  -- GraphQL requires Web
    (525, 508, 'N4_AVANCE'),         -- MLOps requires ML expert
    (525, 505, 'N3_INTERMEDIAIRE')   -- MLOps requires DevOps
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 10. FORMATIONS (IDs 501-525)
-- =============================================================================
-- cout_formation est NOT NULL via auto-unboxing dans FormationWithDocumentsDTO ;
-- on injecte 0.0 par defaut pour eviter les NPE cote service formation.
INSERT INTO formations (
    id_formation, titre_formation, date_debut, date_fin, etat_formation,
    certif_generated, inscriptions_ouvertes, ouverte, charge_horaire_global,
    type_formation, departement_id, up_id, cout_formation, objectifs, acquis
) VALUES
    (501, 'Python pour Data Science',           '2024-09-01', '2024-11-30', 'ACHEVE',   true,  false, false, 40, 'INTERNE', 'D1', 'UP02', 0, 'Maitriser Pandas/NumPy', 'ETL Python'),
    (502, 'Spring Boot Microservices',          '2024-10-01', '2024-12-20', 'ACHEVE',   true,  false, false, 35, 'INTERNE', 'D1', 'UP01', 0, 'Architecture microservices', 'Concevoir microservices'),
    (503, 'Docker & Kubernetes Practitioner',   '2024-11-01', '2025-01-31', 'ACHEVE',   true,  false, false, 30, 'EXTERNE', 'D1', 'UP01', 0, 'Conteneurisation et orchestration', 'Deployer en K8s'),
    (504, 'Machine Learning Scikit-learn',      '2025-02-01', '2025-04-30', 'ACHEVE',   true,  false, false, 45, 'INTERNE', 'D1', 'UP02', 0, 'Algorithmes ML', 'Modele ML end-to-end'),
    (505, 'Deep Learning TensorFlow',           '2025-03-15', '2025-06-15', 'EN_COURS', false, false, true,  50, 'EXTERNE', 'D1', 'UP02', 0, 'Reseaux de neurones', 'CNN/RNN'),
    (506, 'AWS Solutions Architect',            '2025-04-01', '2025-06-30', 'EN_COURS', false, false, true,  60, 'EXTERNE', 'D1', 'UP01', 0, 'Architecture cloud AWS', 'AWS resiliente'),
    (507, 'Big Data Apache Spark',              '2025-05-15', '2025-08-15', 'PLANIFIE', false, true,  true,  45, 'INTERNE', 'D1', 'UP02', 0, 'Donnees massives', 'PySpark'),
    (508, 'Pentest & Ethical Hacking',          '2025-06-01', '2025-08-30', 'PLANIFIE', false, true,  true,  40, 'EXTERNE', 'D2', 'UP03', 0, 'Tests intrusion', 'Pentest complet'),
    (509, 'TDD & Clean Code Java',              '2025-06-15', '2025-08-15', 'PLANIFIE', false, true,  true,  30, 'INTERNE', 'D1', 'UP01', 0, 'Test Driven Development', 'Code couvert 80%+'),
    (510, 'IoT Arduino RPi',                    '2024-09-15', '2024-12-15', 'ACHEVE',   true,  false, false, 35, 'INTERNE', 'D3', 'UP04', 0, 'Programmation embarquee', 'Prototype IoT'),
    (511, '5G NR Air Interface',                '2025-07-01', '2025-09-30', 'PLANIFIE', false, true,  true,  35, 'EXTERNE', 'D4', 'UP05', 0, 'Architecture 5G', 'Couche air 5G'),
    (512, 'Agilite & Scrum Master',             '2025-05-01', '2025-06-30', 'EN_COURS', false, false, true,  20, 'EXTERNE', 'D5', 'UP06', 0, 'Methodes agiles', 'Certif PSM I'),
    (513, 'NLP Transformers BERT',              '2025-09-01', '2025-12-15', 'PLANIFIE', false, true,  true,  50, 'EXTERNE', 'D1', 'UP02', 0, 'NLP moderne LLM', 'Fine-tune BERT'),
    (514, 'GraphQL Apollo Federation',          '2025-07-15', '2025-09-30', 'PLANIFIE', false, true,  true,  25, 'INTERNE', 'D1', 'UP01', 0, 'API GraphQL', 'Federation microservices'),
    (515, 'MLOps Kubeflow',                     '2025-10-01', '2026-01-15', 'PLANIFIE', false, true,  true,  55, 'EXTERNE', 'D1', 'UP02', 0, 'Production ML', 'Pipeline MLOps'),
    (516, 'Cybersecurite Avancee',              '2025-09-01', '2025-11-30', 'PLANIFIE', false, true,  true,  40, 'EXTERNE', 'D2', 'UP03', 0, 'Securite avancee', 'Defense reseaux'),
    (517, 'Architecture Microservices Saga',    '2025-09-15', '2025-11-30', 'PLANIFIE', false, true,  true,  35, 'INTERNE', 'D1', 'UP01', 0, 'Patterns Saga', 'Coordonner microservices'),
    (518, 'PowerBI Avance',                     '2025-08-01', '2025-09-30', 'PLANIFIE', false, true,  true,  25, 'EXTERNE', 'D1', 'UP02', 0, 'Dashboards complexes', 'Reports executive'),
    (519, 'Reseaux Avances SDN',                '2025-09-01', '2025-11-15', 'PLANIFIE', false, true,  true,  35, 'INTERNE', 'D2', 'UP03', 0, 'SDN & NFV', 'Reseaux programmables'),
    (520, 'Vue.js & Composition API',           '2025-08-15', '2025-10-30', 'PLANIFIE', false, true,  true,  25, 'EXTERNE', 'D1', 'UP01', 0, 'Vue 3', 'SPA Vue moderne')
ON CONFLICT (id_formation) DO NOTHING;

-- =============================================================================
-- 11. FORMATION_COMPETENCES : mapping
-- =============================================================================
INSERT INTO formation_competences (
    formation_id, domaine_id, competence_id, competence_nom,
    sous_competence_id, sous_competence_nom, savoir_id, savoir_nom,
    savoir_type, niveau_prerequis, niveau_vise
) VALUES
    (501, 501, 501, 'Programmation Python',   501, 'Syntaxe Python', 501, 'Variables & Types',     'THEORIQUE', 1, 4),
    (501, 501, 501, 'Programmation Python',   501, 'Syntaxe Python', 504, 'Pandas & NumPy',        'PRATIQUE',  2, 4),
    (502, 501, 502, 'Programmation Java',     503, 'Spring Boot',    505, 'Annotations Spring',    'THEORIQUE', 2, 4),
    (502, 501, 502, 'Programmation Java',     503, 'Spring Boot',    506, 'REST Controllers',      'PRATIQUE',  2, 4),
    (502, 502, 512, 'Microservices',          515, 'API Gateway',    521, 'Rate Limiting',         'PRATIQUE',  2, 4),
    (503, 502, 505, 'DevOps & CI/CD',         506, 'Docker',         511, 'Dockerfile',            'PRATIQUE',  1, 4),
    (503, 502, 505, 'DevOps & CI/CD',         507, 'Kubernetes',     512, 'Helm Charts',           'PRATIQUE',  2, 4),
    (504, 504, 508, 'Machine Learning',       511, 'Scikit-learn',   516, 'Regression Lineaire',   'THEORIQUE', 1, 4),
    (504, 504, 508, 'Machine Learning',       511, 'Scikit-learn',   517, 'Random Forest',         'THEORIQUE', 2, 4),
    (505, 504, 509, 'Deep Learning',          512, 'TensorFlow',     518, 'CNN & Transfer',        'THEORIQUE', 3, 4),
    (506, 501, 513, 'Cloud Computing',        516, 'AWS / Azure',    522, 'EC2 / S3 / Lambda',     'PRATIQUE',  1, 4),
    (507, 505, 510, 'Big Data Spark',         513, 'Apache Spark',   519, 'MapReduce',             'THEORIQUE', 2, 4),
    (508, 503, 522, 'Pentest',                522, 'OWASP Pentest',  529, 'Metasploit',            'PRATIQUE',  3, 4),
    (508, 503, 522, 'Pentest',                522, 'OWASP Pentest',  530, 'BurpSuite',             'PRATIQUE',  2, 4),
    (509, 502, 523, 'TDD',                    523, 'Test Pyramid',   532, 'JUnit & Mockito',       'PRATIQUE',  2, 4),
    (510, 506, 514, 'IoT',                    517, 'Arduino / RPi',  523, 'GPIO Programming',      'PRATIQUE',  2, 4),
    (511, 507, 517, 'Communications Mobiles', 520, '5G Protocols',   526, 'NR Air Interface',      'THEORIQUE', 3, 4),
    (512, 508, 518, 'Agilite & Scrum',        NULL, NULL,            541, 'Scrum Framework',       'THEORIQUE', 1, 3),
    (513, 504, 521, 'NLP & LLM',              521, 'Transformers',   527, 'Embeddings & BERT',     'THEORIQUE', 3, 4),
    (513, 504, 521, 'NLP & LLM',              521, 'Transformers',   528, 'Fine-tuning LLM',       'PRATIQUE',  3, 4),
    (514, 501, 524, 'GraphQL',                524, 'Schema GraphQL', 533, 'GraphQL Resolvers',     'PRATIQUE',  2, 4),
    (515, 505, 525, 'MLOps',                  525, 'MLflow Kubeflow',534, 'Model Registry',        'PRATIQUE',  3, 4),
    (515, 505, 525, 'MLOps',                  525, 'MLflow Kubeflow',535, 'CI/CD ML Pipeline',     'PRATIQUE',  3, 4),
    (516, 503, 506, 'Cybersecurite',          508, 'Penetration',    513, 'OWASP Top 10',          'THEORIQUE', 2, 4),
    (517, 502, 512, 'Microservices',          515, 'API Gateway',    545, 'Saga Pattern',          'THEORIQUE', 3, 4),
    (518, 505, 511, 'Data Visualization',     514, 'Power BI',       520, 'DAX Formules',          'PRATIQUE',  2, 4),
    (519, 503, 507, 'Reseaux TCP/IP',         510, 'Routing',        515, 'OSPF / BGP',            'THEORIQUE', 2, 4),
    (520, 501, 503, 'Developpement Web',      504, 'React.js',       544, 'Vue.js',                'PRATIQUE',  2, 3)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 12. INSCRIPTIONS : 60+ inscriptions melant tous etats
-- =============================================================================
INSERT INTO inscriptions (enseignant_id, formation_id, etat, date_demande) VALUES
    -- Formation 501 (Python DS ACHEVE) - APPROVED majoritaires
    ('E00001', 501, 'APPROVED', '2024-08-01'),
    ('E00007', 501, 'APPROVED', '2024-08-05'),
    ('E00012', 501, 'APPROVED', '2024-08-10'),
    ('E00014', 501, 'APPROVED', '2024-08-12'),
    ('E00016', 501, 'APPROVED', '2024-08-15'),
    ('E00017', 501, 'APPROVED', '2024-08-15'),
    ('E00020', 501, 'APPROVED', '2024-08-18'),
    -- Formation 502 (Spring) ACHEVE
    ('E00004', 502, 'APPROVED', '2024-09-01'),
    ('E00012', 502, 'APPROVED', '2024-09-05'),
    ('E00016', 502, 'APPROVED', '2024-09-08'),
    ('E00018', 502, 'REJECTED', '2024-09-10'),
    ('E00009', 502, 'APPROVED', '2024-09-15'),
    -- Formation 503 (Docker) ACHEVE
    ('E00001', 503, 'APPROVED', '2024-10-01'),
    ('E00004', 503, 'APPROVED', '2024-10-05'),
    ('E00012', 503, 'APPROVED', '2024-10-10'),
    ('E00016', 503, 'APPROVED', '2024-10-12'),
    -- Formation 504 (ML) ACHEVE
    ('E00001', 504, 'APPROVED', '2025-01-15'),
    ('E00007', 504, 'APPROVED', '2025-01-20'),
    ('E00017', 504, 'APPROVED', '2025-01-22'),
    ('E00020', 504, 'APPROVED', '2025-01-25'),
    ('E00014', 504, 'REJECTED', '2025-01-28'),
    -- Formation 510 (IoT) ACHEVE
    ('E00003', 510, 'APPROVED', '2024-09-01'),
    ('E00010', 510, 'APPROVED', '2024-09-05'),
    ('E00024', 510, 'APPROVED', '2024-09-08'),
    ('E00025', 510, 'APPROVED', '2024-09-10'),
    -- Formation 505 (DL) EN_COURS
    ('E00007', 505, 'APPROVED', '2025-03-01'),
    ('E00017', 505, 'APPROVED', '2025-03-05'),
    ('E00020', 505, 'APPROVED', '2025-03-08'),
    ('E00014', 505, 'PENDING',  '2025-04-15'),
    ('E00016', 505, 'PENDING',  '2025-04-20'),
    -- Formation 506 (AWS) EN_COURS
    ('E00002', 506, 'APPROVED', '2025-03-15'),
    ('E00008', 506, 'APPROVED', '2025-03-20'),
    ('E00013', 506, 'PENDING',  '2025-04-01'),
    ('E00022', 506, 'PENDING',  '2025-04-10'),
    -- Formation 512 (Scrum) EN_COURS
    ('E00009', 512, 'APPROVED', '2025-04-01'),
    ('E00028', 512, 'APPROVED', '2025-04-05'),
    ('E00029', 512, 'APPROVED', '2025-04-08'),
    -- Formations PLANIFIE - PENDING
    ('E00010', 507, 'PENDING',  '2025-05-01'),
    ('E00017', 507, 'PENDING',  '2025-05-05'),
    ('E00020', 507, 'PENDING',  '2025-05-08'),
    ('E00008', 508, 'PENDING',  '2025-05-10'),
    ('E00021', 508, 'PENDING',  '2025-05-12'),
    ('E00023', 508, 'PENDING',  '2025-05-15'),
    ('E00004', 509, 'PENDING',  '2025-05-15'),
    ('E00012', 509, 'PENDING',  '2025-05-18'),
    ('E00019', 509, 'PENDING',  '2025-05-20'),
    ('E00006', 511, 'PENDING',  '2025-06-01'),
    ('E00026', 511, 'PENDING',  '2025-06-05'),
    ('E00027', 511, 'PENDING',  '2025-06-08'),
    ('E00017', 513, 'PENDING',  '2025-08-01'),
    ('E00020', 513, 'PENDING',  '2025-08-05'),
    ('E00016', 514, 'PENDING',  '2025-06-15'),
    ('E00018', 514, 'PENDING',  '2025-06-20'),
    ('E00017', 515, 'PENDING',  '2025-09-01'),
    ('E00020', 515, 'PENDING',  '2025-09-05'),
    ('E00013', 516, 'PENDING',  '2025-08-15'),
    ('E00022', 516, 'PENDING',  '2025-08-20'),
    ('E00009', 517, 'PENDING',  '2025-08-25'),
    ('E00010', 518, 'PENDING',  '2025-07-15'),
    ('E00002', 519, 'PENDING',  '2025-08-01'),
    ('E00018', 520, 'PENDING',  '2025-07-20')
ON CONFLICT (formation_id, enseignant_id) DO NOTHING;

-- =============================================================================
-- 13. SEANCES : 3 seances par formation ACHEVE/EN_COURS (IDs 501-525)
-- =============================================================================
INSERT INTO seances (id_seance, date_seance, heure_debut, heure_fin, type_seance,
                     duree_theorique, duree_pratique, salle, formation_id) VALUES
    (501, '2024-09-15', '09:00', '12:00', 'THEORIQUE',  2, 1, 'Salle A1',   501),
    (502, '2024-10-15', '09:00', '12:00', 'PRATIQUE',     1, 2, 'Lab B2',     501),
    (503, '2024-11-15', '09:00', '12:00', 'MIXTE', 3, 0, 'Salle A1',   501),
    (504, '2024-11-15', '13:00', '17:00', 'THEORIQUE',  2, 2, 'Lab DevOps', 503),
    (505, '2024-12-15', '13:00', '17:00', 'PRATIQUE',     0, 4, 'Lab DevOps', 503),
    (506, '2025-01-20', '13:00', '17:00', 'MIXTE', 1, 3, 'Lab DevOps', 503),
    (507, '2025-02-15', '09:00', '12:00', 'THEORIQUE',  3, 0, 'Amphi 1',    504),
    (508, '2025-03-15', '09:00', '12:00', 'PRATIQUE',     1, 2, 'Lab IA',     504),
    (509, '2025-04-15', '09:00', '12:00', 'MIXTE', 1, 2, 'Lab IA',     504),
    (510, '2025-04-01', '09:00', '12:00', 'THEORIQUE',  3, 0, 'Amphi 2',    505),
    (511, '2025-05-01', '09:00', '12:00', 'PRATIQUE',     1, 2, 'Lab IA',     505),
    (512, '2025-04-10', '13:00', '16:00', 'THEORIQUE',  3, 0, 'Amphi 3',    506),
    (513, '2024-10-15', '13:00', '16:00', 'THEORIQUE',  2, 1, 'Lab Embarq', 510),
    (514, '2024-11-15', '13:00', '17:00', 'PRATIQUE',     0, 4, 'Lab Embarq', 510),
    (515, '2025-05-15', '09:00', '12:00', 'THEORIQUE',  3, 0, 'Salle GI',   512)
ON CONFLICT (id_seance) DO NOTHING;

-- =============================================================================
-- 14. PRESENCES : taux varies (signal engagement)
-- =============================================================================
INSERT INTO presences (presence, commentaire, seance_id, enseignant_id) VALUES
    -- E00001 tres assidu (8/9)
    (true,  NULL,                501, 'E00001'),
    (true,  NULL,                502, 'E00001'),
    (true,  NULL,                503, 'E00001'),
    (true,  NULL,                504, 'E00001'),
    (true,  NULL,                505, 'E00001'),
    (true,  NULL,                506, 'E00001'),
    (true,  NULL,                507, 'E00001'),
    (false, 'Maladie',           508, 'E00001'),
    (true,  NULL,                509, 'E00001'),
    -- E00007 assidu Python+ML
    (true,  NULL,                501, 'E00007'),
    (true,  NULL,                502, 'E00007'),
    (true,  NULL,                503, 'E00007'),
    (true,  NULL,                507, 'E00007'),
    (true,  NULL,                508, 'E00007'),
    (true,  NULL,                509, 'E00007'),
    (true,  NULL,                510, 'E00007'),
    (true,  NULL,                511, 'E00007'),
    -- E00012 expert assidu
    (true,  NULL,                501, 'E00012'),
    (true,  NULL,                502, 'E00012'),
    (true,  NULL,                503, 'E00012'),
    (true,  NULL,                504, 'E00012'),
    (true,  NULL,                505, 'E00012'),
    (true,  NULL,                506, 'E00012'),
    -- E00014 engagement faible (1/3)
    (true,  NULL,                501, 'E00014'),
    (false, 'Conges',            502, 'E00014'),
    (false, 'Non present',       503, 'E00014'),
    -- E00016 (CUP) assidue
    (true,  NULL,                501, 'E00016'),
    (true,  NULL,                502, 'E00016'),
    (true,  NULL,                503, 'E00016'),
    (true,  NULL,                504, 'E00016'),
    (true,  NULL,                505, 'E00016'),
    (true,  NULL,                506, 'E00016'),
    -- E00017 (Chef Dept) excellent
    (true,  NULL,                501, 'E00017'),
    (true,  NULL,                502, 'E00017'),
    (true,  NULL,                503, 'E00017'),
    (true,  NULL,                507, 'E00017'),
    (true,  NULL,                508, 'E00017'),
    (true,  NULL,                509, 'E00017'),
    (true,  NULL,                510, 'E00017'),
    (true,  NULL,                511, 'E00017'),
    -- E00020 assidu data
    (true,  NULL,                501, 'E00020'),
    (true,  NULL,                502, 'E00020'),
    (true,  NULL,                503, 'E00020'),
    (true,  NULL,                507, 'E00020'),
    (true,  NULL,                508, 'E00020'),
    (true,  NULL,                509, 'E00020'),
    -- E00004 moyen (2/3)
    (true,  NULL,                504, 'E00004'),
    (true,  NULL,                505, 'E00004'),
    (false, 'Absent',            506, 'E00004'),
    -- E00003 IoT
    (true,  NULL,                513, 'E00003'),
    (true,  NULL,                514, 'E00003'),
    -- E00024 IoT
    (true,  NULL,                513, 'E00024'),
    (true,  NULL,                514, 'E00024')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 15. SEANCE_ANIMATEUR
-- =============================================================================
INSERT INTO seance_animateur (seance_id, enseignant_id) VALUES
    (501, 'E00017'), (502, 'E00017'), (503, 'E00012'),
    (504, 'E00016'), (505, 'E00016'), (506, 'E00012'),
    (507, 'E00017'), (508, 'E00017'), (509, 'E00020'),
    (510, 'E00017'), (511, 'E00020'),
    (512, 'E00016'),
    (513, 'E00025'), (514, 'E00024'),
    (515, 'E00028')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 16. BESOIN_FORMATION : 25+ besoins (NOT NULL : event_published, duree, nb_max)
-- =============================================================================
INSERT INTO besoin_formation (
    titre, theme, priorite, duree_formation, nb_max_participants, username,
    approuve_admin, approuve_cup, approuve_chef_dep,
    last_refresh_date, est_ouverte, event_published, type_besoin
) VALUES
    ('Formation MLOps Production',         'MLOps & Kubeflow',          'CRITIQUE', 55, 15, 'E00017', true,  true,  true,  '2025-03-01 09:00', false, true,  0),
    ('Formation NLP Transformers',         'NLP & LLM',                 'HAUTE',    50, 12, 'E00017', true,  true,  true,  '2025-04-15 09:00', false, true,  0),
    ('Formation Pentest Avance',           'Pentest & Ethical Hacking', 'CRITIQUE', 40, 10, 'E00008', true,  true,  true,  '2025-03-20 09:00', false, true,  0),
    ('Formation TDD Java',                 'TDD & Clean Code',          'HAUTE',    30, 15, 'E00004', true,  true,  true,  '2025-04-01 09:00', false, true,  0),
    ('Formation Vue.js avance',            'Vue.js',                    'HAUTE',    25, 12, 'E00018', false, false, false, '2025-03-01 09:00', true,  false, 0),
    ('Formation Saga Microservices',       'Microservices avancees',    'HAUTE',    30, 10, 'E00009', true,  false, false, '2025-02-15 09:00', true,  false, 0),
    ('Formation Pentest Initiation',       'Pentest',                   'HAUTE',    35, 12, 'E00023', false, false, false, '2025-02-01 09:00', true,  false, 0),
    ('Formation Cloud GCP Avance',         'Cloud GCP',                 'CRITIQUE', 45, 10, 'E00002', false, false, false, '2025-01-15 09:00', true,  false, 0),
    ('Formation IoT industriel',           'IoT industriel',            'CRITIQUE', 40, 12, 'E00003', false, false, false, '2025-01-20 09:00', true,  false, 0),
    ('Formation Reseaux SDN',              'SDN & NFV',                 'HAUTE',    30, 10, 'E00002', true,  true,  false, '2025-02-10 09:00', false, false, 0),
    ('Formation GraphQL Federation',       'GraphQL',                   'MOYENNE',  25, 12, 'E00016', false, false, false, '2025-05-01 09:00', true,  false, 0),
    ('Formation Refactoring Patterns',     'Clean Code',                'MOYENNE',  20, 15, 'E00014', false, false, false, '2025-05-05 09:00', true,  false, 0),
    ('Formation Big Data avance',          'Big Data',                  'HAUTE',    40, 12, 'E00010', true,  true,  false, '2025-04-15 09:00', false, false, 0),
    ('Formation Cloud Native Security',    'Cloud Security',            'HAUTE',    35, 10, 'E00021', true,  false, false, '2025-04-20 09:00', false, false, 0),
    ('Formation 5G NR avance',             '5G',                        'CRITIQUE', 45, 10, 'E00026', true,  true,  true,  '2025-03-15 09:00', false, true,  0),
    ('Formation Python Initiation',        'Python',                    'BASSE',    20, 20, 'E00019', false, false, false, '2025-04-25 09:00', true,  false, 0),
    ('Formation Scrum Master',             'Agilite',                   'MOYENNE',  20, 18, 'E00029', false, false, false, '2025-05-01 09:00', true,  false, 0),
    ('Formation TensorFlow',               'Deep Learning',             'HAUTE',    35, 12, 'E00020', true,  true,  true,  '2025-02-20 09:00', false, true,  0),
    ('Formation DevSecOps',                'DevSecOps',                 'CRITIQUE', 40, 12, 'E00021', false, false, false, '2024-12-01 09:00', true,  false, 0),
    ('Formation Architecture Cloud',       'Architecture Cloud',        'HAUTE',    45, 10, 'E00013', false, false, false, '2024-11-20 09:00', true,  false, 0),
    ('Formation Kubernetes Production',    'Kubernetes',                'HAUTE',    30, 12, 'E00012', true,  true,  true,  '2025-05-10 09:00', false, true,  0),
    ('Formation Apache Kafka',             'Streaming',                 'MOYENNE',  25, 12, 'E00009', true,  true,  false, '2025-05-12 09:00', false, false, 0),
    ('Formation Test Performance',         'Tests',                     'MOYENNE',  20, 15, 'E00004', true,  false, true,  '2025-05-15 09:00', false, false, 0),
    ('Formation Spring Security',          'Securite Java',             'HAUTE',    25, 12, 'E00004', false, false, false, '2025-05-20 09:00', true,  false, 0),
    ('Formation Power BI Avance',          'Data Viz',                  'MOYENNE',  25, 15, 'E00010', true,  false, false, '2025-05-22 09:00', false, false, 0)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 17. EVALUATION_FORMATEUR : notes participants
-- =============================================================================
INSERT INTO evaluation_formateur (note, satisfaisant, commentaire, enseignant_id, formation_id) VALUES
    (4.5, true,  'Excellent formateur, contenu pratique',     'E00001', 501),
    (4.2, true,  'Bonne formation',                            'E00007', 501),
    (4.8, true,  'Tres bien structure',                        'E00012', 501),
    (3.8, true,  'Correct mais rythme rapide',                 'E00014', 501),
    (4.6, true,  'Tres satisfaisant',                          'E00016', 501),
    (4.9, true,  'Parfait, je recommande',                     'E00017', 501),
    (4.7, true,  'Tres bon niveau',                            'E00020', 501),
    (4.0, true,  'Bon contenu',                                'E00004', 502),
    (4.5, true,  'Excellent',                                  'E00012', 502),
    (4.3, true,  'Tres bien',                                  'E00016', 502),
    (3.5, true,  'Correct',                                    'E00009', 502),
    (4.4, true,  'Hands-on formidable',                        'E00001', 503),
    (4.0, true,  'Bon equilibre theorie/pratique',             'E00004', 503),
    (4.7, true,  'Excellent formateur',                        'E00012', 503),
    (4.5, true,  'Tres pratique',                              'E00016', 503),
    (4.3, true,  'Tres bon',                                   'E00001', 504),
    (4.8, true,  'Excellent niveau',                           'E00007', 504),
    (4.9, true,  'Parfait',                                    'E00017', 504),
    (4.6, true,  'Tres satisfaisant',                          'E00020', 504),
    (4.2, true,  'Bon contenu IoT',                            'E00003', 510),
    (4.0, true,  'Bien',                                       'E00010', 510),
    (4.5, true,  'Excellent pour les bases IoT',               'E00024', 510),
    (4.3, true,  'Tres bien',                                  'E00025', 510)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 18. EVALUATION_GLOBALE : 1 par formation (unique formation_id)
-- =============================================================================
INSERT INTO evaluation_globale (
    formation_id, commentaire_general, date_evaluation, note_globale, recommandation
) VALUES
    (501, 'Formation Python tres bien notee, contenu pertinent',  '2024-12-01', 4.5, 'RECOMMANDER'),
    (502, 'Formation Spring solide',                              '2025-01-05', 4.1, 'AMELIORER'),
    (503, 'Excellent retour sur Docker/K8s',                      '2025-02-05', 4.4, 'RECOMMANDER'),
    (504, 'ML tres demande, formation a etendre',                 '2025-05-05', 4.6, 'RECOMMANDER'),
    (510, 'IoT bien apprecie',                                    '2024-12-20', 4.3, 'RECOMMANDER')
ON CONFLICT (formation_id) DO NOTHING;

-- =============================================================================
-- 19. CERTIFICATES : delivres pour formations ACHEVE
-- =============================================================================
INSERT INTO certificates (
    formation_id, titre_formation, type_certif, date_debut_formation,
    date_fin_formation, charge_horaire_global, enseignant_id, nom_enseignant,
    prenom_enseignant, mail_enseignant, dept_enseignant, role_en_formation,
    delivered, pdf_file_path
) VALUES
    (501, 'Python pour Data Science', 'PARTICIPATION', '2024-09-01', '2024-11-30', 40, 'E00001', 'Ben Ahmed',  'Mohamed', 'mohamed.benahmed@esprit.tn',  'D1', 'PARTICIPANT', true, '/certs/E00001-F501.pdf'),
    (501, 'Python pour Data Science', 'PARTICIPATION', '2024-09-01', '2024-11-30', 40, 'E00007', 'Khelifi',    'Youssef', 'youssef.khelifi@esprit.tn',   'D1', 'PARTICIPANT', true, '/certs/E00007-F501.pdf'),
    (501, 'Python pour Data Science', 'PARTICIPATION', '2024-09-01', '2024-11-30', 40, 'E00012', 'Ben Salem',  'Leila',   'leila.bensalem@esprit.tn',    'D1', 'PARTICIPANT', true, '/certs/E00012-F501.pdf'),
    (501, 'Python pour Data Science', 'PARTICIPATION', '2024-09-01', '2024-11-30', 40, 'E00016', 'Bouhmidi',   'Sonia',   'sonia.bouhmidi@esprit.tn',    'D1', 'PARTICIPANT', true, '/certs/E00016-F501.pdf'),
    (501, 'Python pour Data Science', 'FORMATEUR',     '2024-09-01', '2024-11-30', 40, 'E00017', 'Haddad',     'Walid',   'walid.haddad@esprit.tn',      'D1', 'FORMATEUR',   true, '/certs/E00017-F501.pdf'),
    (502, 'Spring Boot Microservices','PARTICIPATION', '2024-10-01', '2024-12-20', 35, 'E00004', 'Hamdi',      'Salma',   'salma.hamdi@esprit.tn',       'D1', 'PARTICIPANT', true, '/certs/E00004-F502.pdf'),
    (502, 'Spring Boot Microservices','PARTICIPATION', '2024-10-01', '2024-12-20', 35, 'E00012', 'Ben Salem',  'Leila',   'leila.bensalem@esprit.tn',    'D1', 'PARTICIPANT', true, '/certs/E00012-F502.pdf'),
    (502, 'Spring Boot Microservices','PARTICIPATION', '2024-10-01', '2024-12-20', 35, 'E00016', 'Bouhmidi',   'Sonia',   'sonia.bouhmidi@esprit.tn',    'D1', 'PARTICIPANT', true, '/certs/E00016-F502.pdf'),
    (503, 'Docker & Kubernetes',      'PARTICIPATION', '2024-11-01', '2025-01-31', 30, 'E00001', 'Ben Ahmed',  'Mohamed', 'mohamed.benahmed@esprit.tn',  'D1', 'PARTICIPANT', true, '/certs/E00001-F503.pdf'),
    (503, 'Docker & Kubernetes',      'PARTICIPATION', '2024-11-01', '2025-01-31', 30, 'E00012', 'Ben Salem',  'Leila',   'leila.bensalem@esprit.tn',    'D1', 'PARTICIPANT', true, '/certs/E00012-F503.pdf'),
    (503, 'Docker & Kubernetes',      'PARTICIPATION', '2024-11-01', '2025-01-31', 30, 'E00016', 'Bouhmidi',   'Sonia',   'sonia.bouhmidi@esprit.tn',    'D1', 'PARTICIPANT', true, '/certs/E00016-F503.pdf'),
    (504, 'Machine Learning Scikit',  'PARTICIPATION', '2025-02-01', '2025-04-30', 45, 'E00001', 'Ben Ahmed',  'Mohamed', 'mohamed.benahmed@esprit.tn',  'D1', 'PARTICIPANT', true, '/certs/E00001-F504.pdf'),
    (504, 'Machine Learning Scikit',  'PARTICIPATION', '2025-02-01', '2025-04-30', 45, 'E00007', 'Khelifi',    'Youssef', 'youssef.khelifi@esprit.tn',   'D1', 'PARTICIPANT', true, '/certs/E00007-F504.pdf'),
    (504, 'Machine Learning Scikit',  'PARTICIPATION', '2025-02-01', '2025-04-30', 45, 'E00020', 'Daoud',      'Syrine',  'syrine.daoud@esprit.tn',      'D1', 'PARTICIPANT', true, '/certs/E00020-F504.pdf'),
    (510, 'IoT Arduino RPi',          'PARTICIPATION', '2024-09-15', '2024-12-15', 35, 'E00003', 'Bouaziz',    'Khaled',  'khaled.bouaziz@esprit.tn',    'D2', 'PARTICIPANT', true, '/certs/E00003-F510.pdf'),
    (510, 'IoT Arduino RPi',          'PARTICIPATION', '2024-09-15', '2024-12-15', 35, 'E00024', 'Brahim',     'Hela',    'hela.brahim@esprit.tn',       'D3', 'PARTICIPANT', true, '/certs/E00024-F510.pdf'),
    (505, 'Deep Learning TensorFlow', 'PARTICIPATION', '2025-03-15', '2025-06-15', 50, 'E00007', 'Khelifi',    'Youssef', 'youssef.khelifi@esprit.tn',   'D1', 'PARTICIPANT', false, NULL),
    (505, 'Deep Learning TensorFlow', 'PARTICIPATION', '2025-03-15', '2025-06-15', 50, 'E00017', 'Haddad',     'Walid',   'walid.haddad@esprit.tn',      'D1', 'PARTICIPANT', false, NULL),
    (505, 'Deep Learning TensorFlow', 'PARTICIPATION', '2025-03-15', '2025-06-15', 50, 'E00020', 'Daoud',      'Syrine',  'syrine.daoud@esprit.tn',      'D1', 'PARTICIPANT', false, NULL)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 20. SYNCHRONISATION DES SEQUENCES (apres tous les INSERT avec ID explicites)
-- =============================================================================
SELECT setval(pg_get_serial_sequence('domaines',         'id'),
              GREATEST((SELECT COALESCE(MAX(id), 1) FROM domaines), 1));
SELECT setval(pg_get_serial_sequence('competences',      'id'),
              GREATEST((SELECT COALESCE(MAX(id), 1) FROM competences), 1));
SELECT setval(pg_get_serial_sequence('sous_competences', 'id'),
              GREATEST((SELECT COALESCE(MAX(id), 1) FROM sous_competences), 1));
SELECT setval(pg_get_serial_sequence('savoirs',          'id'),
              GREATEST((SELECT COALESCE(MAX(id), 1) FROM savoirs), 1));
SELECT setval(pg_get_serial_sequence('formations',       'id_formation'),
              GREATEST((SELECT COALESCE(MAX(id_formation), 1) FROM formations), 1));
SELECT setval(pg_get_serial_sequence('seances',          'id_seance'),
              GREATEST((SELECT COALESCE(MAX(id_seance), 1) FROM seances), 1));

-- =============================================================================
-- VERIFICATION POST-SEED (a executer manuellement)
-- =============================================================================
-- SELECT 'enseignants'             AS table_name, COUNT(*) FROM enseignants
-- UNION ALL SELECT 'domaines',               COUNT(*) FROM domaines
-- UNION ALL SELECT 'competences',            COUNT(*) FROM competences
-- UNION ALL SELECT 'sous_competences',       COUNT(*) FROM sous_competences
-- UNION ALL SELECT 'savoirs',                COUNT(*) FROM savoirs
-- UNION ALL SELECT 'enseignant_competences', COUNT(*) FROM enseignant_competences
-- UNION ALL SELECT 'niveau_savoir_requis',   COUNT(*) FROM niveau_savoir_requis
-- UNION ALL SELECT 'formations',             COUNT(*) FROM formations
-- UNION ALL SELECT 'formation_competences',  COUNT(*) FROM formation_competences
-- UNION ALL SELECT 'inscriptions',           COUNT(*) FROM inscriptions
-- UNION ALL SELECT 'seances',                COUNT(*) FROM seances
-- UNION ALL SELECT 'presences',              COUNT(*) FROM presences
-- UNION ALL SELECT 'besoin_formation',       COUNT(*) FROM besoin_formation
-- UNION ALL SELECT 'evaluation_formateur',   COUNT(*) FROM evaluation_formateur
-- UNION ALL SELECT 'evaluation_globale',     COUNT(*) FROM evaluation_globale
-- UNION ALL SELECT 'certificates',           COUNT(*) FROM certificates;
