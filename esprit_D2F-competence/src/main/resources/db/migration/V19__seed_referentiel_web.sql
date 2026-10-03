-- V19__seed_referentiel_web.sql
-- Peuple le référentiel de compétences du domaine Développement Web (WEB).
--
-- Contexte : V14 a créé le domaine 'WEB' (UP_WEB/DEPT_WEB) mais SANS contenu.
-- Conséquence : les enseignants du Développement Web (ex : E00007, UP_WEB /
-- DEPT_WEB) avaient un périmètre vide (list_competencies_for_scope → 0
-- compétence), l'analyse contextuelle basculait sur le référentiel global
-- (fallback explicite "Référentiel incomplet") et affichait ~20 gaps
-- hors périmètre avec un risque gonflé (93 % pour E00007).
--
-- Contenu : 6 compétences métier WEB (frontend, backend, données, qualité,
-- UX, outils) + 21 sous-compétences + 26 savoirs + niveaux requis.
-- Convention de codes : dotted 'WEB.*' (zéro collision avec les codes courts
-- GC S1..T5 ni les autres domaines). Idempotent : ON CONFLICT DO NOTHING.
-- Leçon V16 : UNE SEULE ligne niveau_savoir_requis par savoir (pas de
-- contrainte unique sur savoir_id → doublons possibles sinon). N3 par défaut,
-- N2 pour les savoirs transversaux (SEO, AGILE).

-- ── Compétences (domaine WEB) ──────────────────────────────────────────────
INSERT INTO competences (code, nom, description, ordre, domaine_id, created_at, created_by, version) VALUES
    ('WEB.FRONT', 'Développement Frontend',  'HTML, CSS, JavaScript, React et responsive design',              1, (SELECT id FROM domaines WHERE code = 'WEB'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.BACK',  'Développement Backend',   'API REST, authentification et frameworks backend',               2, (SELECT id FROM domaines WHERE code = 'WEB'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.DATA',  'Données pour le web',     'Bases relationnelles et NoSQL au service des apps web',          3, (SELECT id FROM domaines WHERE code = 'WEB'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.QA',    'Qualité et sécurité web', 'Tests, sécurité OWASP et performance des apps web',              4, (SELECT id FROM domaines WHERE code = 'WEB'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.UX',    'Expérience utilisateur',  'Design d''interfaces, accessibilité et référencement',           5, (SELECT id FROM domaines WHERE code = 'WEB'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.TOOLS', 'Outils et mise en production', 'Git, CI/CD, Docker et méthodes agiles',                    6, (SELECT id FROM domaines WHERE code = 'WEB'), '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

-- ── Sous-compétences (niveau=1, parent_id=NULL) ────────────────────────────
INSERT INTO sous_competences (code, nom, description, competence_id, niveau, created_at, created_by, version) VALUES
    -- Frontend (5)
    ('WEB.FRONT.HTML',  'HTML et CSS sémantique',  'Structurer et styliser des pages web sémantiques',        (SELECT id FROM competences WHERE code = 'WEB.FRONT'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.FRONT.JS',    'JavaScript moderne',      'DOM, événements, ES6+ et appels API',                     (SELECT id FROM competences WHERE code = 'WEB.FRONT'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.FRONT.REACT', 'React et composants',     'Concevoir des interfaces à composants avec React',       (SELECT id FROM competences WHERE code = 'WEB.FRONT'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.FRONT.RESP',  'Responsive design',       'Adapter la mise en page au mobile et au desktop',        (SELECT id FROM competences WHERE code = 'WEB.FRONT'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.FRONT.TS',    'TypeScript',              'Typer et sécuriser le code frontend avec TypeScript',     (SELECT id FROM competences WHERE code = 'WEB.FRONT'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Backend (4)
    ('WEB.BACK.API',    'API REST',                'Concevoir et implémenter des API REST',                   (SELECT id FROM competences WHERE code = 'WEB.BACK'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.BACK.AUTH',   'Authentification',        'Sécuriser les accès par JWT et sessions',                 (SELECT id FROM competences WHERE code = 'WEB.BACK'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.BACK.SPRING', 'Framework backend',       'Développer un service backend avec Spring Boot et JPA',   (SELECT id FROM competences WHERE code = 'WEB.BACK'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.BACK.DOC',    'Documentation API',       'Documenter les API avec OpenAPI et Swagger',              (SELECT id FROM competences WHERE code = 'WEB.BACK'), 1, '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

INSERT INTO sous_competences (code, nom, description, competence_id, niveau, created_at, created_by, version) VALUES
    -- Données (3)
    ('WEB.DATA.SQL',   'Bases relationnelles', 'Modéliser et requêter des bases SQL',            (SELECT id FROM competences WHERE code = 'WEB.DATA'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.DATA.JPA',   'Persistance JPA',      'Persister les entités avec JPA et Hibernate',    (SELECT id FROM competences WHERE code = 'WEB.DATA'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.DATA.NOSQL', 'Bases NoSQL',          'Manipuler des bases orientées documents',        (SELECT id FROM competences WHERE code = 'WEB.DATA'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Qualité (3)
    ('WEB.QA.TEST', 'Tests logiciels',   'Écrire des tests unitaires et d''intégration',   (SELECT id FROM competences WHERE code = 'WEB.QA'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.QA.SEC',  'Sécurité OWASP',    'Prévenir XSS, CSRF et injections',                (SELECT id FROM competences WHERE code = 'WEB.QA'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.QA.PERF', 'Performance web',   'Optimiser les temps de chargement',               (SELECT id FROM competences WHERE code = 'WEB.QA'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    -- UX (3)
    ('WEB.UX.DESIGN', 'Design d''interfaces', 'Maquetter des interfaces avec Figma',         (SELECT id FROM competences WHERE code = 'WEB.UX'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.UX.A11Y',   'Accessibilité',        'Appliquer les règles d''accessibilité WCAG', (SELECT id FROM competences WHERE code = 'WEB.UX'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.UX.SEO',    'Référencement SEO',    'Optimiser le référencement technique',        (SELECT id FROM competences WHERE code = 'WEB.UX'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Outils (3)
    ('WEB.TOOLS.GIT',   'Versionnement Git',     'Versionner et collaborer avec Git',        (SELECT id FROM competences WHERE code = 'WEB.TOOLS'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.TOOLS.CICD',  'CI/CD et déploiement',  'Automatiser build et déploiement Docker',  (SELECT id FROM competences WHERE code = 'WEB.TOOLS'), 1, '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.TOOLS.AGILE', 'Méthodes agiles',       'Pratiquer Scrum en équipe de dev web',     (SELECT id FROM competences WHERE code = 'WEB.TOOLS'), 1, '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

-- ── Savoirs WEB (rattachés aux sous-compétences) ───────────────────────────
INSERT INTO savoirs (code, nom, description, type, sous_competence_id, created_at, created_by, version) VALUES
    -- Frontend HTML/JS
    ('WEB.FRONT.HTML.SEM', 'Structurer page HTML5',       'Structurer une page en HTML5 sémantique',          'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'WEB.FRONT.HTML'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.FRONT.HTML.CSS', 'Styliser avec CSS moderne',   'Mettre en page avec Flexbox et Grid',              'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.FRONT.HTML'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.FRONT.JS.DOM',   'Manipuler le DOM',            'Manipuler le DOM et gérer les événements',         'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.FRONT.JS'),   '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.FRONT.JS.ES6',   'Exploiter ES6 et Fetch',      'Utiliser ES6+ et consommer des API via Fetch',     'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.FRONT.JS'),   '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Frontend React/Responsive/TS
    ('WEB.FRONT.REACT.COMP',  'Concevoir composants React', 'Créer des composants React réutilisables',       'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.FRONT.REACT'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.FRONT.REACT.STATE', 'Gérer état et routage',      'Gérer l''état applicatif et le routage React',   'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.FRONT.REACT'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.FRONT.RESP.MEDIA',  'Adapter mise en page',       'Rendre une interface responsive mobile/desktop',  'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.FRONT.RESP'),  '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.FRONT.TS.TYPES',    'Typer avec TypeScript',      'Typer le code frontend avec TypeScript',          'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.FRONT.TS'),    '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Backend API/Auth
    ('WEB.BACK.API.DESIGN', 'Concevoir API REST',         'Concevoir des API REST ressource-orientées',       'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'WEB.BACK.API'),  '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.BACK.API.CRUD',   'Implémenter endpoints CRUD', 'Implémenter les opérations CRUD d''une API',       'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.BACK.API'),  '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.BACK.AUTH.JWT',   'Sécuriser avec JWT',         'Authentifier et autoriser avec des jetons JWT',    'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.BACK.AUTH'), '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

INSERT INTO savoirs (code, nom, description, type, sous_competence_id, created_at, created_by, version) VALUES
    -- Backend Spring/Doc + Données
    ('WEB.BACK.SPRING.SVC', 'Développer service Spring Boot', 'Créer un service REST avec Spring Boot',        'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.BACK.SPRING'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.BACK.SPRING.JPA', 'Persister avec JPA',             'Mapper et persister avec JPA et Hibernate',     'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.BACK.SPRING'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.BACK.DOC.SWAGGER','Documenter API OpenAPI',         'Documenter une API avec OpenAPI et Swagger',    'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.BACK.DOC'),    '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.DATA.SQL.MODEL',  'Modéliser schéma SQL',           'Concevoir un schéma relationnel normalisé',     'THEORIQUE', (SELECT id FROM sous_competences WHERE code = 'WEB.DATA.SQL'),   '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.DATA.SQL.QUERY',  'Requêter en SQL',                'Écrire des requêtes SQL complexes',             'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.DATA.SQL'),   '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.DATA.NOSQL.MONGO','Manipuler MongoDB',              'Stocker et requêter des documents MongoDB',     'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.DATA.NOSQL'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- Qualité
    ('WEB.QA.TEST.UNIT', 'Écrire tests unitaires',  'Tester avec Vitest et JUnit',                  'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.QA.TEST'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.QA.SEC.OWASP', 'Prévenir failles OWASP',  'Corriger XSS, CSRF et injections',             'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.QA.SEC'),  '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.QA.PERF.OPTIM','Optimiser chargement',    'Réduire les temps de chargement web',          'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.QA.PERF'), '2026-01-01 08:00:00', 'migration-seed', 0),
    -- UX + Outils
    ('WEB.UX.DESIGN.FIGMA','Maquetter avec Figma',  'Prototyper des interfaces avec Figma',         'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.UX.DESIGN'), '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.UX.A11Y.WCAG',   'Appliquer WCAG',        'Rendre une app conforme aux règles WCAG',      'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.UX.A11Y'),   '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.UX.SEO.TECH',    'Optimiser SEO technique','Améliorer le référencement technique',        'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.UX.SEO'),    '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.TOOLS.GIT.FLOW',  'Versionner avec Git',  'Collaborer avec des branches Git',             'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.TOOLS.GIT'),   '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.TOOLS.CICD.DOCKER','Déployer avec Docker','Conteneuriser et déployer avec Docker',        'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.TOOLS.CICD'),  '2026-01-01 08:00:00', 'migration-seed', 0),
    ('WEB.TOOLS.AGILE.SCRUM','Pratiquer Scrum',     'Animer les rituels Scrum en équipe',           'PRATIQUE',  (SELECT id FROM sous_competences WHERE code = 'WEB.TOOLS.AGILE'), '2026-01-01 08:00:00', 'migration-seed', 0)
ON CONFLICT (code) DO NOTHING;

-- ── Niveaux requis par savoir ──────────────────────────────────────────────
-- N3_INTERMEDIAIRE par défaut ; N2_ELEMENTAIRE pour les savoirs transversaux
-- (SEO, AGILE). Une seule ligne par savoir (pas de contrainte unique sur
-- savoir_id — cf. correctif V16).
INSERT INTO niveau_savoir_requis (savoir_id, competence_id, sous_competence_id, niveau, description, created_at, created_by, version)
SELECT s.id, c.id, sc.id, 'N3_INTERMEDIAIRE', 'Niveau requis pour ' || s.nom, '2026-01-01 08:00:00', 'migration-seed', 0
FROM savoirs s
JOIN sous_competences sc ON sc.id = s.sous_competence_id
JOIN competences c ON c.id = sc.competence_id
WHERE c.code LIKE 'WEB.%'
  AND s.code NOT IN ('WEB.UX.SEO.TECH', 'WEB.TOOLS.AGILE.SCRUM')
ON CONFLICT DO NOTHING;

INSERT INTO niveau_savoir_requis (savoir_id, competence_id, sous_competence_id, niveau, description, created_at, created_by, version)
SELECT s.id, c.id, sc.id, 'N2_ELEMENTAIRE', 'Niveau requis pour ' || s.nom, '2026-01-01 08:00:00', 'migration-seed', 0
FROM savoirs s
JOIN sous_competences sc ON sc.id = s.sous_competence_id
JOIN competences c ON c.id = sc.competence_id
WHERE s.code IN ('WEB.UX.SEO.TECH', 'WEB.TOOLS.AGILE.SCRUM')
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
