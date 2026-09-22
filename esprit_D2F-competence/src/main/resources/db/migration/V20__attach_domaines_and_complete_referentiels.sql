-- V20 : rattache tous les domaines à une UP/departement et complete les
-- referentiels manquants (INFO, DATA.ENG, SYS.CLOUD, PED.NUM) pour que
-- list_competencies_for_scope couvre les 7 perimetres.
--
-- Contexte : V6 (DEV/RESEAU/AI/PEDAG) ne remplissait pas up_id/departement_id ;
-- V14 a ajoute GC/WEB. En base live les domaines etaient rattaches manuellement
-- (DEV-01, INFO...) hors migrations — cette migration rend le seed reproductible.
-- Idempotent : ON CONFLICT (code) DO NOTHING + UPDATE si colonnes vides.

-- ── Domaines : rattachement UP / departement ─────────────────────────────────
UPDATE domaines SET up_id = 'UP_GL',   departement_id = 'DEPT_GL'
WHERE code IN ('DEV', 'DEV-01') AND (up_id IS NULL OR departement_id IS NULL);

UPDATE domaines SET up_id = 'UP_RT',   departement_id = 'DEPT_RT'
WHERE code = 'RESEAU' AND (up_id IS NULL OR departement_id IS NULL);

UPDATE domaines SET up_id = 'UP_IA',   departement_id = 'DEPT_IA'
WHERE code = 'AI' AND (up_id IS NULL OR departement_id IS NULL);

UPDATE domaines SET up_id = 'UP_INF2', departement_id = 'DEPT_INF2'
WHERE code = 'PEDAG' AND (up_id IS NULL OR departement_id IS NULL);

UPDATE domaines SET up_id = 'UP_INFO', departement_id = 'DEPT_INFO'
WHERE code = 'INFO' AND (up_id IS NULL OR departement_id IS NULL);

UPDATE domaines SET up_id = 'UP_GC',   departement_id = 'DEPT_GC'
WHERE code = 'GC' AND (up_id IS NULL OR departement_id IS NULL);

UPDATE domaines SET up_id = 'UP_WEB',  departement_id = 'DEPT_WEB'
WHERE code = 'WEB' AND (up_id IS NULL OR departement_id IS NULL);

-- Domaine INFO absent des migrations V6/V14 (seed live manuel)
INSERT INTO domaines (code, nom, description, actif, created_at, created_by, version, up_id, departement_id) VALUES
    ('INFO', 'Informatique', 'Informatique generale : programmation, bases de donnees, reseaux', true, NOW(), 'migration', 0, 'UP_INFO', 'DEPT_INFO')
ON CONFLICT (code) DO NOTHING;

UPDATE domaines SET up_id = 'UP_INFO', departement_id = 'DEPT_INFO'
WHERE code = 'INFO' AND (up_id IS NULL OR departement_id IS NULL);

-- ── Compétences absentes des migrations (presentes en base live) ─────────────
-- DATA.ENG (domaine AI), SYS.CLOUD (RESEAU), PED.NUM (PEDAG)
INSERT INTO competences (code, nom, description, ordre, domaine_id, created_at, created_by, version) VALUES
    ('DATA.ENG',    'Ingenierie des Donnees', 'Pipelines, ETL, data lakes et visualisation', 3,
     (SELECT id FROM domaines WHERE code = 'AI'), NOW(), 'migration', 0),
    ('SYS.CLOUD',   'Systemes & Cloud', 'Administration Linux, IaC et cloud', 3,
     (SELECT id FROM domaines WHERE code = 'RESEAU'), NOW(), 'migration', 0),
    ('PED.NUM',     'Pedagogie Numerique', 'LMS, videos et micro-learning', 2,
     (SELECT id FROM domaines WHERE code = 'PEDAG'), NOW(), 'migration', 0),
    ('INFO.PROG',   'Programmation & Algorithmique', 'Algorithmique, Python, Java/OOP', 1,
     (SELECT id FROM domaines WHERE code = 'INFO'), NOW(), 'migration', 0),
    ('INFO.BDD',    'Bases de Donnees', 'SQL avance, modelisation et optimisation', 2,
     (SELECT id FROM domaines WHERE code = 'INFO'), NOW(), 'migration', 0),
    ('INFO.RESEAUX','Reseaux Informatiques', 'Protocoles TCP/IP et architectures reseau', 3,
     (SELECT id FROM domaines WHERE code = 'INFO'), NOW(), 'migration', 0)
ON CONFLICT (code) DO NOTHING;

-- ── Sous-compétences ─────────────────────────────────────────────────────────
INSERT INTO sous_competences (code, nom, description, competence_id, niveau, created_at, created_by, version) VALUES
    ('DATA.ENG.PIPE',   'Pipelines de donnees', 'Pandas, Airflow, ETL/ELT', (SELECT id FROM competences WHERE code = 'DATA.ENG'), 1, NOW(), 'migration', 0),
    ('DATA.ENG.VIZ',    'Visualisation', 'Power BI et dashboards', (SELECT id FROM competences WHERE code = 'DATA.ENG'), 1, NOW(), 'migration', 0),
    ('SYS.CLOUD.ADM',   'Administration Linux', 'Shell, services, securite systeme', (SELECT id FROM competences WHERE code = 'SYS.CLOUD'), 1, NOW(), 'migration', 0),
    ('SYS.CLOUD.IAC',   'Infrastructure as Code', 'Ansible et automatisation', (SELECT id FROM competences WHERE code = 'SYS.CLOUD'), 1, NOW(), 'migration', 0),
    ('PED.NUM.LMS',     'Moodle & LMS', 'Moodle, micro-learning', (SELECT id FROM competences WHERE code = 'PED.NUM'), 1, NOW(), 'migration', 0),
    ('PED.NUM.CONTENT', 'Contenus video', 'Videos courtes et interactives', (SELECT id FROM competences WHERE code = 'PED.NUM'), 1, NOW(), 'migration', 0),
    ('SC.INFO.PYTHON',  'Python & structures', 'Python et structures de donnees', (SELECT id FROM competences WHERE code = 'INFO.PROG'), 1, NOW(), 'migration', 0),
    ('SC.INFO.JAVA',    'Java oriente objet', 'Java OOP et frameworks', (SELECT id FROM competences WHERE code = 'INFO.PROG'), 1, NOW(), 'migration', 0),
    ('SC.INFO.SQL',     'SQL avance', 'SQL, optimisation, NoSQL', (SELECT id FROM competences WHERE code = 'INFO.BDD'), 1, NOW(), 'migration', 0),
    ('SC.INFO.NOSQL',   'Bases NoSQL', 'MongoDB et bases documentaires', (SELECT id FROM competences WHERE code = 'INFO.BDD'), 1, NOW(), 'migration', 0),
    ('SC.INFO.TCPIP',   'Protocoles reseau', 'TCP/IP, routage', (SELECT id FROM competences WHERE code = 'INFO.RESEAUX'), 1, NOW(), 'migration', 0)
ON CONFLICT (code) DO NOTHING;

-- ── Savoirs ──────────────────────────────────────────────────────────────────
INSERT INTO savoirs (code, nom, description, type, sous_competence_id, created_at, created_by, version) VALUES
    ('S.DATA.PANDAS',  'Pandas & Nettoyage de Donnees', 'Manipulation et nettoyage avec Pandas', 'SAVOIR_FAIRE',
     (SELECT id FROM sous_competences WHERE code = 'DATA.ENG.PIPE'), NOW(), 'migration', 0),
    ('S.DATA.AIRFLOW', 'Airflow & Orchestration ETL', 'Orchestration de pipelines', 'SAVOIR_FAIRE',
     (SELECT id FROM sous_competences WHERE code = 'DATA.ENG.PIPE'), NOW(), 'migration', 0),
    ('S.DATA.POWERBI', 'Power BI / Dashboards', 'Tableaux de bord et dataviz', 'SAVOIR_FAIRE',
     (SELECT id FROM sous_competences WHERE code = 'DATA.ENG.VIZ'), NOW(), 'migration', 0),
    ('S.SYS.LINUX',    'Administration Linux', 'Administration et securite Linux', 'SAVOIR_FAIRE',
     (SELECT id FROM sous_competences WHERE code = 'SYS.CLOUD.ADM'), NOW(), 'migration', 0),
    ('S.SYS.ANSIBLE',  'Ansible & IaC', 'Automatisation d''infrastructure', 'SAVOIR_FAIRE',
     (SELECT id FROM sous_competences WHERE code = 'SYS.CLOUD.IAC'), NOW(), 'migration', 0),
    ('S.PED.MOODLE',   'Moodle & LMS', 'Moodle et plateformes LMS', 'SAVOIR_FAIRE',
     (SELECT id FROM sous_competences WHERE code = 'PED.NUM.LMS'), NOW(), 'migration', 0),
    ('S.PED.VIDEO',    'Videos & Micro-learning', 'Creation de contenus video courts', 'SAVOIR_FAIRE',
     (SELECT id FROM sous_competences WHERE code = 'PED.NUM.CONTENT'), NOW(), 'migration', 0),
    ('S.INFO.PYTHON',  'Python & Structures de Donnees', 'Python et structures de donnees', 'SAVOIR_FAIRE',
     (SELECT id FROM sous_competences WHERE code = 'SC.INFO.PYTHON'), NOW(), 'migration', 0),
    ('S.INFO.ALGO',    'Algorithmique Avancee', 'Algorithmes et complexite', 'SAVOIR',
     (SELECT id FROM sous_competences WHERE code = 'SC.INFO.PYTHON'), NOW(), 'migration', 0),
    ('S.INFO.JAVAOOP', 'Java Oriente Objet', 'Java OOP et conception', 'SAVOIR_FAIRE',
     (SELECT id FROM sous_competences WHERE code = 'SC.INFO.JAVA'), NOW(), 'migration', 0),
    ('S.INFO.SQLADV',  'SQL Avance & Optimisation', 'SQL avance et index', 'SAVOIR_FAIRE',
     (SELECT id FROM sous_competences WHERE code = 'SC.INFO.SQL'), NOW(), 'migration', 0),
    ('S.INFO.TCPIP',   'Protocoles TCP/IP', 'TCP/IP et couche reseau', 'SAVOIR',
     (SELECT id FROM sous_competences WHERE code = 'SC.INFO.TCPIP'), NOW(), 'migration', 0)
ON CONFLICT (code) DO NOTHING;

-- ── Niveaux requis (une seule ligne par savoir — leçon V16) ──────────────────
INSERT INTO niveau_savoir_requis (savoir_id, competence_id, sous_competence_id, niveau, description, created_at, created_by, version)
SELECT s.id, c.id, sc.id, 'N3_INTERMEDIAIRE', 'Niveau requis pour ' || s.nom, NOW(), 'migration', 0
FROM savoirs s
JOIN sous_competences sc ON sc.id = s.sous_competence_id
JOIN competences c ON c.id = sc.competence_id
WHERE s.code IN (
    'S.DATA.PANDAS','S.DATA.AIRFLOW','S.DATA.POWERBI',
    'S.SYS.LINUX','S.SYS.ANSIBLE',
    'S.PED.MOODLE','S.PED.VIDEO',
    'S.INFO.PYTHON','S.INFO.ALGO','S.INFO.JAVAOOP','S.INFO.SQLADV','S.INFO.TCPIP'
)
  AND NOT EXISTS (SELECT 1 FROM niveau_savoir_requis n WHERE n.savoir_id = s.id);

-- ── Resequencement (convention V13) ──────────────────────────────────────────
SELECT setval('competence.domaines_id_seq', (SELECT max(id) FROM competence.domaines))
WHERE EXISTS (SELECT 1 FROM competence.domaines);
SELECT setval('competence.competences_id_seq', (SELECT max(id) FROM competence.competences))
WHERE EXISTS (SELECT 1 FROM competence.competences);
SELECT setval('competence.sous_competences_id_seq', (SELECT max(id) FROM competence.sous_competences))
WHERE EXISTS (SELECT 1 FROM competence.sous_competences);
SELECT setval('competence.savoirs_id_seq', (SELECT max(id) FROM competence.savoirs))
WHERE EXISTS (SELECT 1 FROM competence.savoirs);
SELECT setval('competence.niveau_savoir_requis_id_seq', (SELECT max(id) FROM competence.niveau_savoir_requis))
WHERE EXISTS (SELECT 1 FROM competence.niveau_savoir_requis);
