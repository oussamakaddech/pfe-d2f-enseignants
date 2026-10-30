-- V15__seed_referentiel_gc.sql
-- Peuple le référentiel de compétences du domaine Génie Civil (GC).
--
-- Contexte : V14 a créé les domaines 'GC' (UP_GC/DEPT_GC) et 'WEB' (UP_WEB/
-- DEPT_WEB) mais SANS contenu. Conséquence : les enseignants du Génie Civil
-- (ex : ENS015, UP_GC / DEPT_GC) avaient un périmètre vide
-- (list_competencies_for_scope → 0 compétence), l'analyse contextuelle basculait
-- sur le référentiel global (fallback explicite "Référentiel incomplet") et
-- affichait des gaps hors périmètre (DEV.FRONT, AI.ML...) avec des formations
-- sans rapport avec l'enseignant.
--
-- Contenu : 6 compétences métier GC (sols, construction, physique du bâtiment,
-- eau, urbanisme, transversales) + sous-compétences + savoirs + niveaux requis,
-- conformes au référentiel filière GC ESPRIT décrit dans data.sql.
-- Idempotent : ON CONFLICT (code) DO NOTHING sur toutes les tables.

-- ── Compétences (domaine GC) ─────────────────────────────────────────────────
INSERT INTO competences (code, nom, description, ordre, domaine_id, created_at, created_by, version) VALUES
    ('GC-TECH-S', 'Compétences sols',             'Géologie, géotechnique, fondations et risques du sol',              1, (SELECT id FROM domaines WHERE code = 'GC'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('GC-TECH-C', 'Compétences construction',     'Structures béton armé, ouvrages d''art, routes et gestion projet', 2, (SELECT id FROM domaines WHERE code = 'GC'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('GC-TECH-P', 'Physique du bâtiment',         'Thermique, acoustique et équipements techniques',                  3, (SELECT id FROM domaines WHERE code = 'GC'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('GC-TECH-E', 'Compétences eau',              'Hydraulique, hydrologie et diagnostic environnemental',            4, (SELECT id FROM domaines WHERE code = 'GC'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('GC-TECH-U', 'Compétences urbanisme',        'Analyse et aménagement urbain',                                    5, (SELECT id FROM domaines WHERE code = 'GC'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('GC-TECH-T', 'Compétences transversales GC', 'BIM, normes, sécurité, communication et management GC',            6, (SELECT id FROM domaines WHERE code = 'GC'), '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

-- ── Sous-compétences (niveau=1, parent_id=NULL) ─────────────────────────────
INSERT INTO sous_competences (code, nom, description, competence_id, niveau, created_at, created_by, version) VALUES
    -- Sols (S1–S6)
    ('S1', 'Coupe géologique',           'Lire, effectuer et interpréter une coupe géologique',        (SELECT id FROM competences WHERE code = 'GC-TECH-S'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S2', 'Essais géotechniques',       'Réaliser et interpréter les essais géotechniques',           (SELECT id FROM competences WHERE code = 'GC-TECH-S'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S3', 'Risque rupture de pente',    'Évaluer le risque de rupture de pente',                      (SELECT id FROM competences WHERE code = 'GC-TECH-S'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S4', 'Instabilité hydraulique',    'Analyser l''instabilité hydraulique des sols',               (SELECT id FROM competences WHERE code = 'GC-TECH-S'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S5', 'Risque sismique',            'Évaluer le risque sismique sur les structures',              (SELECT id FROM competences WHERE code = 'GC-TECH-S'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S6', 'Fondations et soutènements', 'Concevoir et dimensionner fondations et soutènements',       (SELECT id FROM competences WHERE code = 'GC-TECH-S'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Construction (C1–C8)
    ('C1', 'Structure bâtiment béton armé', 'Concevoir et dimensionner des structures en béton armé',  (SELECT id FROM competences WHERE code = 'GC-TECH-C'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C2', 'Ouvrage d''art',                'Concevoir et dimensionner des ouvrages d''art',           (SELECT id FROM competences WHERE code = 'GC-TECH-C'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C3', 'Infrastructure routière',       'Concevoir et superviser les infrastructures routières',   (SELECT id FROM competences WHERE code = 'GC-TECH-C'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C4', 'Gestion projet infrastructure', 'Gérer un projet d''infrastructure de A à Z',              (SELECT id FROM competences WHERE code = 'GC-TECH-C'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C5', 'Étude d''impacts',              'Réaliser une étude d''impacts environnementaux',          (SELECT id FROM competences WHERE code = 'GC-TECH-C'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C6', 'Modes constructifs',            'Maîtriser les différents modes constructifs',             (SELECT id FROM competences WHERE code = 'GC-TECH-C'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C7', 'État de santé structurel',      'Évaluer l''état de santé structurel d''un ouvrage',       (SELECT id FROM competences WHERE code = 'GC-TECH-C'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C8', 'Réhabilitation ouvrage d''art', 'Planifier et piloter la réhabilitation d''ouvrages',      (SELECT id FROM competences WHERE code = 'GC-TECH-C'), 1, '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

-- Sous-compétences Physique / Eau / Urbanisme / Transversales
INSERT INTO sous_competences (code, nom, description, competence_id, niveau, created_at, created_by, version) VALUES
    ('P1', 'Physique du bâtiment',             'Analyser et modéliser la physique du bâtiment',              (SELECT id FROM competences WHERE code = 'GC-TECH-P'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('P2', 'Santé thermique et acoustique',    'Diagnostiquer la santé thermique et acoustique',             (SELECT id FROM competences WHERE code = 'GC-TECH-P'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('P3', 'Équipements techniques',           'Dimensionner les équipements techniques du bâtiment',        (SELECT id FROM competences WHERE code = 'GC-TECH-P'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('E1', 'Hydraulique et hydrologie',        'Maîtriser l''hydraulique et la modélisation hydrologique',   (SELECT id FROM competences WHERE code = 'GC-TECH-E'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('E2', 'Diagnostic hydrologie',            'Réaliser un diagnostic hydrologique complet',                (SELECT id FROM competences WHERE code = 'GC-TECH-E'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('E3', 'Diagnostic environnemental',       'Réaliser un diagnostic environnemental',                     (SELECT id FROM competences WHERE code = 'GC-TECH-E'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('U1', 'Analyse urbaine',                  'Réaliser une analyse urbaine du territoire',                 (SELECT id FROM competences WHERE code = 'GC-TECH-U'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('U2', 'Diagnostic urbain',                'Élaborer un diagnostic urbain',                              (SELECT id FROM competences WHERE code = 'GC-TECH-U'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('U3', 'Projet d''aménagement urbain',     'Concevoir et piloter un projet d''aménagement urbain',       (SELECT id FROM competences WHERE code = 'GC-TECH-U'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('T1', 'Outils numériques BIM',            'Maîtriser les outils numériques et le BIM',                  (SELECT id FROM competences WHERE code = 'GC-TECH-T'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('T2', 'Normes et réglementations',        'Appliquer les normes et réglementations du GC',              (SELECT id FROM competences WHERE code = 'GC-TECH-T'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('T3', 'Qualité et sécurité chantier',     'Mettre en place les démarches qualité et sécurité chantier', (SELECT id FROM competences WHERE code = 'GC-TECH-T'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('T4', 'Communication professionnelle GC', 'Communiquer efficacement dans le milieu du génie civil',     (SELECT id FROM competences WHERE code = 'GC-TECH-T'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('T5', 'Management d''équipe GC',          'Coordonner et manager une équipe pluridisciplinaire',        (SELECT id FROM competences WHERE code = 'GC-TECH-T'), 1, '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

-- ── Savoirs GC (rattachés aux sous-compétences) ─────────────────────────────
INSERT INTO savoirs (code, nom, description, type, sous_competence_id, created_at, created_by, version) VALUES
    -- Sols S1/S2
    ('S1a', 'Lire coupe géologique',                 'Lire, effectuer et interpréter une coupe géologique',          'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'S1'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S2a', 'Réaliser essais géotechniques',         'Réaliser les essais géotechniques en laboratoire et in situ', 'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'S2'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S2b', 'Interpréter essais géotechniques',      'Interpréter les résultats des essais géotechniques',          'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'S2'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Sols S3/S4/S5/S6
    ('S3',  'Évaluer risque rupture de pente',       'Évaluer le risque de rupture de pente',                       'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'S3'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S4',  'Analyser instabilité hydraulique',      'Analyser l''instabilité hydraulique des sols',                'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'S4'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S5',  'Évaluer risque sismique',               'Évaluer le risque sismique sur les structures',               'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'S5'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('S6',  'Dimensionner fondations',               'Concevoir et dimensionner fondations et soutènements',        'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'S6'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Construction C1
    ('C1a', 'Concevoir structure béton armé',        'Concevoir les structures en béton armé',                      'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'C1'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C1b', 'Dimensionner structure béton armé',     'Dimensionner les structures en béton armé',                   'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C1'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C1c', 'Vérifier conformité structurelle BA',   'Vérifier la conformité aux normes des structures BA',         'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C1'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Construction C2/C3
    ('C2a', 'Concevoir ouvrage d''art',              'Concevoir les différents types d''ouvrages d''art',           'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C2'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C2b', 'Dimensionner ouvrage d''art',           'Calculer et dimensionner les ouvrages d''art',                'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'C2'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C2c', 'Contrôler exécution ouvrage d''art',    'Contrôler l''exécution et la qualité des ouvrages d''art',    'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C2'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C3a', 'Concevoir infrastructure routière',     'Concevoir le tracé et les ouvrages d''une infrastructure routière', 'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C3'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C3b', 'Dimensionner chaussée et terrassement', 'Calculer les dimensionnements de chaussée et terrassement',   'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'C3'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C3c', 'Superviser chantier routier',           'Superviser et piloter un chantier de construction routière',  'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C3'), '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

INSERT INTO savoirs (code, nom, description, type, sous_competence_id, created_at, created_by, version) VALUES
    -- Construction C4–C8
    ('C4', 'Gérer projet d''infrastructure',   'Planifier, piloter et contrôler un projet d''infrastructure',      'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C4'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C5', 'Réaliser étude d''impacts',        'Conduire une étude d''impacts environnementaux complète',          'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C5'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C6', 'Maîtriser modes constructifs',     'Connaître et choisir les modes constructifs appropriés',           'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'C6'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C7', 'Évaluer état de santé structurel', 'Diagnostiquer l''état de santé structurel d''un ouvrage existant', 'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C7'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('C8', 'Réhabiliter ouvrage d''art',       'Planifier et piloter la réhabilitation d''ouvrages d''art',        'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'C8'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Physique P1/P2/P3
    ('P1a', 'Analyser physique du bâtiment',      'Analyser les phénomènes physiques affectant le bâtiment',       'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'P1'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('P1b', 'Modéliser comportement thermique',   'Modéliser le comportement thermique d''un bâtiment',            'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'P1'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('P1c', 'Optimiser performance énergétique',  'Optimiser la performance énergétique des bâtiments',            'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'P1'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('P2',  'Diagnostiquer santé thermique et acoustique', 'Diagnostiquer la santé thermique et acoustique',         'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'P2'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('P3',  'Dimensionner équipements techniques',         'Dimensionner les équipements techniques d''un bâtiment','PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'P3'), '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

INSERT INTO savoirs (code, nom, description, type, sous_competence_id, created_at, created_by, version) VALUES
    -- Eau E1/E2/E3
    ('E1a', 'Maîtriser hydraulique',        'Maîtriser les lois et principes de l''hydraulique',                'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'E1'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('E1b', 'Modéliser hydrologie',         'Modéliser les phénomènes hydrologiques d''un bassin versant',      'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'E1'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('E2',  'Réaliser diagnostic hydrologique',    'Réaliser un diagnostic hydrologique complet',                'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'E2'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('E3',  'Réaliser diagnostic environnemental', 'Conduire un diagnostic environnemental global',              'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'E3'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Urbanisme U1/U2/U3
    ('U1',  'Réaliser analyse urbaine',             'Analyser le tissu urbain d''un territoire',                  'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'U1'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('U2',  'Élaborer diagnostic urbain',           'Élaborer un diagnostic urbain complet',                      'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'U2'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('U3a', 'Concevoir projet d''aménagement urbain','Concevoir un projet d''aménagement urbain durable',          'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'U3'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('U3b', 'Piloter projet d''aménagement urbain',  'Piloter la mise en œuvre d''un projet d''aménagement urbain','PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'U3'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Transversales T1–T5
    ('T1', 'Maîtriser outils numériques BIM',         'Utiliser les outils numériques et la méthodologie BIM',          'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'T1'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('T2', 'Appliquer normes et réglementations',     'Appliquer les normes et réglementations en vigueur en GC',       'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'T2'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('T3', 'Gérer qualité et sécurité chantier',      'Mettre en place les démarches qualité et sécurité chantier',     'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'T3'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('T4', 'Communiquer en contexte professionnel GC','Communiquer efficacement dans le milieu du génie civil',         'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'T4'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('T5', 'Manager équipe pluridisciplinaire',       'Coordonner et manager une équipe pluridisciplinaire',            'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'T5'), '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

-- ── Niveaux requis par savoir (utilisés par predictive-analytics pour les gaps) ──
-- N3_INTERMEDIAIRE par défaut (hors transversaux) ; N2_ELEMENTAIRE pour les
-- savoirs transversaux/comms (convention V11 : S.PED.* à N2). L'exclusion des
-- codes T2/T4/T5 du lot N3 évite les doublons : la table n'a pas de contrainte
-- unique sur savoir_id, seul un lot par savoir doit exister.
INSERT INTO niveau_savoir_requis (savoir_id, competence_id, sous_competence_id, niveau, description, created_at, created_by, version)
SELECT s.id, c.id, sc.id, 'N3_INTERMEDIAIRE', 'Niveau requis pour ' || s.nom, '2026-01-01 08:00:00', 'migration-seed', 0
FROM savoirs s
JOIN sous_competences sc ON sc.id = s.sous_competence_id
JOIN competences c ON c.id = sc.competence_id
WHERE c.code LIKE 'GC-TECH-%'
  AND s.code NOT IN ('T2', 'T4', 'T5')
ON CONFLICT DO NOTHING;

INSERT INTO niveau_savoir_requis (savoir_id, competence_id, sous_competence_id, niveau, description, created_at, created_by, version)
SELECT s.id, c.id, sc.id, 'N2_ELEMENTAIRE', 'Niveau requis pour ' || s.nom, '2026-01-01 08:00:00', 'migration-seed', 0
FROM savoirs s
JOIN sous_competences sc ON sc.id = s.sous_competence_id
JOIN competences c ON c.id = sc.competence_id
WHERE s.code IN ('T2', 'T4', 'T5')
ON CONFLICT DO NOTHING;

-- ── Resynchronisation des séquences (convention V13) ────────────────────────
SELECT setval('competence.competences_id_seq', (SELECT max(id) FROM competence.competences))
WHERE EXISTS (SELECT 1 FROM competence.competences);
SELECT setval('competence.sous_competences_id_seq', (SELECT max(id) FROM competence.sous_competences))
WHERE EXISTS (SELECT 1 FROM competence.sous_competences);
SELECT setval('competence.savoirs_id_seq', (SELECT max(id) FROM competence.savoirs))
WHERE EXISTS (SELECT 1 FROM competence.savoirs);
SELECT setval('competence.niveau_savoir_requis_id_seq', (SELECT max(id) FROM competence.niveau_savoir_requis))
WHERE EXISTS (SELECT 1 FROM competence.niveau_savoir_requis);
