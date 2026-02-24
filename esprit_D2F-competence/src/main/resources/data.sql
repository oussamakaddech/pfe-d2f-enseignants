-- ═══════════════════════════════════════════════════════════════════════════════
-- DOMAINES EXISTANTS (INFO, MATH, LANG)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO domaines (code, nom, description, actif) VALUES 
('INFO', 'Informatique', 'Département d''ingénierie informatique', true),
('MATH', 'Mathématiques', 'Département de mathématiques appliquées', true),
('LANG', 'Langues', 'Département des langues et communication', true)
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, actif = EXCLUDED.actif;

INSERT INTO competences (code, nom, description, ordre, domaine_id) VALUES 
('INFO-DEV', 'Développement Logiciel', 'Capacité à concevoir et développer des applications', 1, (SELECT id FROM domaines WHERE code = 'INFO')),
('INFO-RESEAU', 'Réseaux et Sécurité', 'Conception et administration de réseaux informatiques', 2, (SELECT id FROM domaines WHERE code = 'INFO')),
('INFO-DATA', 'Data Science', 'Analyse de données et intelligence artificielle', 3, (SELECT id FROM domaines WHERE code = 'INFO'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, ordre = EXCLUDED.ordre;

INSERT INTO sous_competences (code, nom, description, competence_id) VALUES 
('INFO-DEV-WEB', 'Développement Web', 'Création d''applications web front-end et back-end', (SELECT id FROM competences WHERE code = 'INFO-DEV')),
('INFO-DEV-MOB', 'Développement Mobile', 'Création d''applications pour smartphones', (SELECT id FROM competences WHERE code = 'INFO-DEV')),
('INFO-DEV-ARCH', 'Architecture Logicielle', 'Conception de l''architecture des systèmes', (SELECT id FROM competences WHERE code = 'INFO-DEV'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description;

INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES 
('INFO-DEV-WEB-REACT', 'ReactJS', 'Maîtrise de la bibliothèque ReactJS pour le front-end', 'PRATIQUE', (SELECT id FROM sous_competences WHERE code = 'INFO-DEV-WEB')),
('INFO-DEV-WEB-SPRING', 'Spring Boot', 'Développement d''API REST avec Spring Boot', 'PRATIQUE', (SELECT id FROM sous_competences WHERE code = 'INFO-DEV-WEB')),
('INFO-DEV-WEB-HTTP', 'Protocole HTTP', 'Compréhension approfondie du protocole HTTP et REST', 'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'INFO-DEV-WEB')),
('INFO-DEV-WEB-TEAM', 'Travail en équipe Agile', 'Capacité à travailler en méthode Scrum/Agile', 'PRATIQUE', (SELECT id FROM sous_competences WHERE code = 'INFO-DEV-WEB'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DOMAINES GÉNIE CIVIL (GC)
-- Référentiel complet filière GC ESPRIT – Domaine 5 : Technique/Métier
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO domaines (code, nom, description, actif) VALUES
('GC-TECH', 'Technique / Métier Génie Civil',  'Compétences techniques et métier de l''ingénieur GC', true),
('GC-RDI',  'Recherche et Innovation',          'Capacité de recherche et d''innovation en GC',       true),
('GC-PERS', 'Personnel et Relationnel',          'Compétences personnelles et relationnelles',         true),
('GC-COM',  'Communication et Culture',          'Communication professionnelle et culture générale',  true),
('GC-PED',  'Pédagogie',                         'Compétences pédagogiques de l''enseignant GC',       true)
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, actif = EXCLUDED.actif;

-- ── Compétences sous GC-TECH ────────────────────────────────────────────────
INSERT INTO competences (code, nom, description, ordre, domaine_id) VALUES
('GC-TECH-S', 'Compétences sols',              'Géologie, géotechnique, fondations et risques du sol',              1, (SELECT id FROM domaines WHERE code = 'GC-TECH')),
('GC-TECH-C', 'Compétences construction',      'Structures béton armé, ouvrages d''art, routes et gestion projet', 2, (SELECT id FROM domaines WHERE code = 'GC-TECH')),
('GC-TECH-P', 'Physique du bâtiment',          'Thermique, acoustique et équipements techniques',                   3, (SELECT id FROM domaines WHERE code = 'GC-TECH')),
('GC-TECH-E', 'Compétences eau',               'Hydraulique, hydrologie et diagnostic environnemental',             4, (SELECT id FROM domaines WHERE code = 'GC-TECH')),
('GC-TECH-U', 'Compétences urbanisme',         'Analyse et aménagement urbain',                                    5, (SELECT id FROM domaines WHERE code = 'GC-TECH')),
('GC-TECH-T', 'Compétences transversales GC',  'BIM, normes, sécurité, communication et management GC',             6, (SELECT id FROM domaines WHERE code = 'GC-TECH'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, ordre = EXCLUDED.ordre;

-- ── Sous-compétences Sols (S1–S6) ───────────────────────────────────────────
INSERT INTO sous_competences (code, nom, description, competence_id) VALUES
('S1', 'Coupe géologique',            'Lire, effectuer et interpréter une coupe géologique',        (SELECT id FROM competences WHERE code = 'GC-TECH-S')),
('S2', 'Essais géotechniques',        'Réaliser et interpréter les essais géotechniques',           (SELECT id FROM competences WHERE code = 'GC-TECH-S')),
('S3', 'Risque rupture de pente',     'Évaluer le risque de rupture de pente',                     (SELECT id FROM competences WHERE code = 'GC-TECH-S')),
('S4', 'Instabilité hydraulique',     'Analyser l''instabilité hydraulique des sols',              (SELECT id FROM competences WHERE code = 'GC-TECH-S')),
('S5', 'Risque sismique',             'Évaluer le risque sismique sur les structures',             (SELECT id FROM competences WHERE code = 'GC-TECH-S')),
('S6', 'Fondations et soutènements',  'Concevoir et dimensionner fondations et soutènements',      (SELECT id FROM competences WHERE code = 'GC-TECH-S'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description;

-- ── Sous-compétences Construction (C1–C8) ───────────────────────────────────
INSERT INTO sous_competences (code, nom, description, competence_id) VALUES
('C1', 'Structure bâtiment béton armé', 'Concevoir et dimensionner des structures en béton armé',   (SELECT id FROM competences WHERE code = 'GC-TECH-C')),
('C2', 'Ouvrage d''art',                'Concevoir et dimensionner des ouvrages d''art',            (SELECT id FROM competences WHERE code = 'GC-TECH-C')),
('C3', 'Infrastructure routière',       'Concevoir et superviser les infrastructures routières',    (SELECT id FROM competences WHERE code = 'GC-TECH-C')),
('C4', 'Gestion projet infrastructure', 'Gérer un projet d''infrastructure de A à Z',               (SELECT id FROM competences WHERE code = 'GC-TECH-C')),
('C5', 'Étude d''impacts',              'Réaliser une étude d''impacts environnementaux',           (SELECT id FROM competences WHERE code = 'GC-TECH-C')),
('C6', 'Modes constructifs',            'Maîtriser les différents modes constructifs',              (SELECT id FROM competences WHERE code = 'GC-TECH-C')),
('C7', 'État de santé structurel',      'Évaluer l''état de santé structurel d''un ouvrage',        (SELECT id FROM competences WHERE code = 'GC-TECH-C')),
('C8', 'Réhabilitation ouvrage d''art', 'Planifier et piloter la réhabilitation d''ouvrages',       (SELECT id FROM competences WHERE code = 'GC-TECH-C'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description;

-- ── Sous-compétences Physique du bâtiment (P1–P3) ───────────────────────────
INSERT INTO sous_competences (code, nom, description, competence_id) VALUES
('P1', 'Physique du bâtiment',          'Analyser et modéliser la physique du bâtiment',           (SELECT id FROM competences WHERE code = 'GC-TECH-P')),
('P2', 'Santé thermique et acoustique', 'Diagnostiquer la santé thermique et acoustique',          (SELECT id FROM competences WHERE code = 'GC-TECH-P')),
('P3', 'Équipements techniques',        'Dimensionner les équipements techniques du bâtiment',     (SELECT id FROM competences WHERE code = 'GC-TECH-P'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description;

-- ── Sous-compétences Eau (E1–E3) ────────────────────────────────────────────
INSERT INTO sous_competences (code, nom, description, competence_id) VALUES
('E1', 'Hydraulique et hydrologie',  'Maîtriser l''hydraulique et la modélisation hydrologique', (SELECT id FROM competences WHERE code = 'GC-TECH-E')),
('E2', 'Diagnostic hydrologie',      'Réaliser un diagnostic hydrologique complet',             (SELECT id FROM competences WHERE code = 'GC-TECH-E')),
('E3', 'Diagnostic environnemental', 'Réaliser un diagnostic environnemental',                  (SELECT id FROM competences WHERE code = 'GC-TECH-E'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description;

-- ── Sous-compétences Urbanisme (U1–U3) ──────────────────────────────────────
INSERT INTO sous_competences (code, nom, description, competence_id) VALUES
('U1', 'Analyse urbaine',              'Réaliser une analyse urbaine du territoire',              (SELECT id FROM competences WHERE code = 'GC-TECH-U')),
('U2', 'Diagnostic urbain',            'Élaborer un diagnostic urbain',                           (SELECT id FROM competences WHERE code = 'GC-TECH-U')),
('U3', 'Projet d''aménagement urbain', 'Concevoir et piloter un projet d''aménagement urbain',   (SELECT id FROM competences WHERE code = 'GC-TECH-U'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description;

-- ── Sous-compétences Transversales GC (T1–T5) ──────────────────────────────
INSERT INTO sous_competences (code, nom, description, competence_id) VALUES
('T1', 'Outils numériques BIM',         'Maîtriser les outils numériques et le BIM',              (SELECT id FROM competences WHERE code = 'GC-TECH-T')),
('T2', 'Normes et réglementations',     'Appliquer les normes et réglementations du GC',          (SELECT id FROM competences WHERE code = 'GC-TECH-T')),
('T3', 'Qualité et sécurité chantier',  'Gérer la qualité et la sécurité sur chantier',           (SELECT id FROM competences WHERE code = 'GC-TECH-T')),
('T4', 'Communication professionnelle', 'Communiquer en contexte professionnel GC',               (SELECT id FROM competences WHERE code = 'GC-TECH-T')),
('T5', 'Management pluridisciplinaire', 'Manager une équipe pluridisciplinaire de chantier',       (SELECT id FROM competences WHERE code = 'GC-TECH-T'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description;

-- ── Savoirs (46 au total) ───────────────────────────────────────────────────

-- Sols – S1 (Coupe géologique)
INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES
('S1a', 'Effectuer une coupe géologique',               'Réaliser une coupe géologique à partir de données terrain',       'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'S1')),
('S1b', 'Interpréter données géologiques',              'Lire et interpréter les données géologiques de terrain',          'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'S1')),
('S1c', 'Modéliser couches géologiques',                'Modéliser les couches géologiques à l''aide d''outils numériques','PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'S1')),
('S1d', 'Rédiger rapport géologique',                   'Rédiger un rapport géologique complet et structuré',              'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'S1'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;

-- Sols – S2 (Essais géotechniques)
INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES
('S2a', 'Réaliser essais géotechniques en laboratoire', 'Effectuer les essais géotechniques normalisés en laboratoire',    'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'S2')),
('S2b', 'Interpréter résultats géotechniques',          'Analyser et interpréter les résultats d''essais géotechniques',   'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'S2'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;

-- Sols – S3/S4/S5 (Risques)
INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES
('S3', 'Évaluer risque rupture de pente',  'Analyser la stabilité des pentes et évaluer les risques',      'PRATIQUE', (SELECT id FROM sous_competences WHERE code = 'S3')),
('S4', 'Analyser instabilité hydraulique', 'Évaluer les risques d''instabilité hydraulique des sols',      'PRATIQUE', (SELECT id FROM sous_competences WHERE code = 'S4')),
('S5', 'Évaluer risque sismique',          'Évaluer le risque sismique et ses impacts sur les structures', 'PRATIQUE', (SELECT id FROM sous_competences WHERE code = 'S5'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;

-- Sols – S6 (Fondations & soutènements)
INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES
('S6a', 'Concevoir fondations',           'Concevoir des fondations adaptées au contexte géotechnique',   'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'S6')),
('S6b', 'Dimensionner soutènements',      'Calculer et dimensionner les ouvrages de soutènement',        'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'S6')),
('S6c', 'Vérifier stabilité fondations',  'Vérifier la stabilité et la conformité des fondations',        'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'S6'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;

-- Construction – C1 (Structure bâtiment béton armé)
INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES
('C1a', 'Concevoir structure bâtiment béton armé',     'Concevoir la structure porteuse d''un bâtiment en béton armé',      'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C1')),
('C1b', 'Dimensionner structure béton armé',           'Calculer et dimensionner les éléments structuraux en BA',           'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'C1')),
('C1c', 'Vérifier conformité structurelle béton armé', 'Vérifier la conformité aux normes des structures BA',              'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C1'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;

-- Construction – C2 (Ouvrage d'art)
INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES
('C2a', 'Concevoir ouvrage d''art',           'Concevoir les différents types d''ouvrages d''art',         'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C2')),
('C2b', 'Dimensionner ouvrage d''art',        'Calculer et dimensionner les ouvrages d''art',              'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'C2')),
('C2c', 'Contrôler exécution ouvrage d''art', 'Contrôler l''exécution et la qualité des ouvrages d''art', 'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C2'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;

-- Construction – C3 (Infrastructure routière)
INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES
('C3a', 'Concevoir infrastructure routière',     'Concevoir le tracé et les ouvrages d''une infrastructure routière', 'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C3')),
('C3b', 'Dimensionner chaussée et terrassement', 'Calculer les dimensionnements de chaussée et terrassement',        'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'C3')),
('C3c', 'Superviser chantier routier',            'Superviser et piloter un chantier de construction routière',       'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C3'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;

-- Construction – C4/C5/C6/C7/C8 (savoirs unitaires)
INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES
('C4', 'Gérer projet d''infrastructure',    'Planifier, piloter et contrôler un projet d''infrastructure',     'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C4')),
('C5', 'Réaliser étude d''impacts',         'Conduire une étude d''impacts environnementaux complète',         'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C5')),
('C6', 'Maîtriser modes constructifs',      'Connaître et choisir les modes constructifs appropriés',          'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'C6')),
('C7', 'Évaluer état de santé structurel',  'Diagnostiquer l''état de santé structurel d''un ouvrage existant','PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C7')),
('C8', 'Réhabiliter ouvrage d''art',        'Planifier et piloter la réhabilitation d''ouvrages d''art',       'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C8'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;

-- Physique – P1 (Physique du bâtiment)
INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES
('P1a', 'Analyser physique du bâtiment',       'Analyser les phénomènes physiques affectant le bâtiment',   'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'P1')),
('P1b', 'Modéliser comportement thermique',    'Modéliser le comportement thermique d''un bâtiment',        'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'P1')),
('P1c', 'Optimiser performance énergétique',   'Optimiser la performance énergétique des bâtiments',       'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'P1'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;

-- Physique – P2/P3
INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES
('P2', 'Diagnostiquer santé thermique et acoustique', 'Diagnostiquer la santé thermique et acoustique',           'PRATIQUE', (SELECT id FROM sous_competences WHERE code = 'P2')),
('P3', 'Dimensionner équipements techniques',         'Dimensionner les équipements techniques d''un bâtiment',  'PRATIQUE', (SELECT id FROM sous_competences WHERE code = 'P3'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;

-- Eau – E1
INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES
('E1a', 'Maîtriser hydraulique',  'Maîtriser les lois et principes de l''hydraulique',            'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'E1')),
('E1b', 'Modéliser hydrologie',   'Modéliser les phénomènes hydrologiques d''un bassin versant', 'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'E1'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;

-- Eau – E2/E3
INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES
('E2', 'Réaliser diagnostic hydrologique',    'Réaliser un diagnostic hydrologique complet',    'PRATIQUE', (SELECT id FROM sous_competences WHERE code = 'E2')),
('E3', 'Réaliser diagnostic environnemental', 'Conduire un diagnostic environnemental global',  'PRATIQUE', (SELECT id FROM sous_competences WHERE code = 'E3'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;

-- Urbanisme – U1/U2/U3
INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES
('U1',  'Réaliser analyse urbaine',                  'Analyser le tissu urbain d''un territoire',                    'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'U1')),
('U2',  'Élaborer diagnostic urbain',                'Élaborer un diagnostic urbain complet',                        'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'U2')),
('U3a', 'Concevoir projet d''aménagement urbain',    'Concevoir un projet d''aménagement urbain durable',            'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'U3')),
('U3b', 'Piloter projet d''aménagement urbain',      'Piloter la mise en œuvre d''un projet d''aménagement urbain',  'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'U3'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;

-- Transversales GC – T1/T2/T3/T4/T5
INSERT INTO savoirs (code, nom, description, type, sous_competence_id) VALUES
('T1', 'Maîtriser outils numériques BIM',          'Utiliser les outils numériques et la méthodologie BIM',           'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'T1')),
('T2', 'Appliquer normes et réglementations',       'Appliquer les normes et réglementations en vigueur en GC',       'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'T2')),
('T3', 'Gérer qualité et sécurité chantier',        'Mettre en place les démarches qualité et sécurité chantier',     'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'T3')),
('T4', 'Communiquer en contexte professionnel GC',  'Communiquer efficacement dans le milieu du génie civil',         'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'T4')),
('T5', 'Manager équipe pluridisciplinaire',          'Coordonner et manager une équipe pluridisciplinaire',            'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'T5'))
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, description = EXCLUDED.description, type = EXCLUDED.type;
