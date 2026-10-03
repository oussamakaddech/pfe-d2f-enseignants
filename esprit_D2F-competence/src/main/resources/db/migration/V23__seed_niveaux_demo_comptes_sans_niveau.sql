-- V23__seed_niveaux_demo_comptes_sans_niveau.sql
-- Niveaux de DÉMONSTRATION pour les 8 comptes qui n'avaient aucun niveau saisi.
--
-- Contexte : sans aucun niveau, l'analyse prédictive porte tous les écarts au
-- maximum par défaut ; ces comptes étaient exclus du classement des
-- enseignants à risque (« score non significatif »). Cette migration leur
-- donne un profil pour que l'analyse et le modèle ML puissent être montrés.
--
-- CE NE SONT PAS DES ÉVALUATIONS RÉELLES : valeurs choisies pour être
-- cohérentes avec la spécialité déclarée de chaque compte (fiche
-- formation.enseignants) et différenciées entre elles. Elles sont à remplacer
-- par une vraie saisie. Traçabilité : created_by = 'seed-demo-23'.
-- Retrait : DELETE FROM enseignant_competences WHERE created_by = 'seed-demo-23';
--
-- Idempotent : ON CONFLICT (enseignant_id, savoir_id) DO NOTHING
-- (uq_enseignant_savoir) — une saisie réelle existante n'est jamais écrasée.
-- Résolution par CODE de savoir (jamais par id).

INSERT INTO enseignant_competences (enseignant_id, savoir_id, niveau, date_acquisition, commentaire, created_at, created_by, version)
SELECT t.enseignant_id,
       s.id,
       t.niveau,
       t.date_acquisition::date,
       'Niveau de démonstration (V23) — pas une évaluation réelle',
       now(),
       'seed-demo-23',
       0
FROM (VALUES
    -- E00004 Hatem SALHI — DEPT_GL, architecture logicielle / microservices : back-end solide
    ('E00004', 'S.SPRING.BOOT',   'AVANCE',    '2026-03-10'),
    ('E00004', 'S.API.REST',      'AVANCE',    '2026-03-10'),
    ('E00004', 'S.API.OPENAPI',   'CONFIRME',  '2026-03-10'),
    ('E00004', 'S.SPRING.SEC',    'CONFIRME',  '2026-05-20'),
    ('E00004', 'S.DB.POSTGRESQL', 'CONFIRME',  '2026-05-20'),
    ('E00004', 'S.DEVOPS.DOCKER', 'CONFIRME',  '2026-06-15'),
    ('E00004', 'S.TEST.JUNIT',    'INITIE',    '2026-06-15'),
    ('E00004', 'S.REACT.HOOKS',   'INITIE',    '2025-12-01'),
    -- ENS902 Karim Maalej — DEPT_GL, génie logiciel : cœur Spring correct, outillage faible
    ('ENS902', 'S.SPRING.BOOT',   'CONFIRME',  '2025-11-15'),
    ('ENS902', 'S.SPRING.HIBER',  'CONFIRME',  '2025-11-15'),
    ('ENS902', 'S.API.REST',      'CONFIRME',  '2026-02-01'),
    ('ENS902', 'S.DB.FLYWAY',     'DEBUTANT',  '2026-02-01'),
    ('ENS902', 'S.DEVOPS.CICD',   'DEBUTANT',  '2026-04-12'),
    ('ENS902', 'S.DEVOPS.DOCKER', 'INITIE',    '2026-04-12'),
    ('ENS902', 'S.TEST.CYPRESS',  'DEBUTANT',  '2026-04-12'),
    ('ENS902', 'S.REACT.TS',      'INITIE',    '2025-11-15'),
    -- E00005 Salma TRIGUI — DEPT_IA, apprentissage automatique : ML fort, DL/orchestration plus faibles
    ('E00005', 'S.ML.SKLEARN',    'AVANCE',    '2026-01-20'),
    ('E00005', 'S.ML.EVAL',       'AVANCE',    '2026-01-20'),
    ('E00005', 'S.ML.CLUSTER',    'CONFIRME',  '2026-04-05'),
    ('E00005', 'S.DL.TF',         'INITIE',    '2026-04-05'),
    ('E00005', 'S.DATA.PANDAS',   'CONFIRME',  '2026-06-30'),
    ('E00005', 'S.DATA.AIRFLOW',  'DEBUTANT',  '2026-06-30'),
    -- ENS903 Fatma Jlassi — DEPT_IA, maître assistante : profil en construction
    ('ENS903', 'S.ML.SKLEARN',    'INITIE',    '2026-02-14'),
    ('ENS903', 'S.ML.EVAL',       'INITIE',    '2026-02-14'),
    ('ENS903', 'S.DL.TF',         'DEBUTANT',  '2026-05-02'),
    ('ENS903', 'S.DATA.PANDAS',   'INITIE',    '2026-05-02'),
    ('ENS903', 'S.DATA.POWERBI',  'CONFIRME',  '2026-07-18'),
    -- E00007 Oussama KADDECH — DEPT_WEB : front avancé, back correct, UX/sécurité à renforcer
    ('E00007', 'WEB.FRONT.REACT.COMP',  'AVANCE',   '2026-06-01'),
    ('E00007', 'WEB.FRONT.REACT.STATE', 'CONFIRME', '2026-06-01'),
    ('E00007', 'WEB.FRONT.TS.TYPES',    'CONFIRME', '2026-06-01'),
    ('E00007', 'WEB.FRONT.JS.ES6',      'AVANCE',   '2026-03-15'),
    ('E00007', 'WEB.FRONT.HTML.CSS',    'CONFIRME', '2026-03-15'),
    ('E00007', 'WEB.BACK.API.DESIGN',   'CONFIRME', '2026-07-10'),
    ('E00007', 'WEB.BACK.SPRING.SVC',   'CONFIRME', '2026-07-10'),
    ('E00007', 'WEB.BACK.AUTH.JWT',     'INITIE',   '2026-07-10'),
    ('E00007', 'WEB.DATA.SQL.QUERY',    'CONFIRME', '2026-05-05'),
    ('E00007', 'WEB.TOOLS.GIT.FLOW',    'AVANCE',   '2026-03-15'),
    ('E00007', 'WEB.TOOLS.CICD.DOCKER', 'INITIE',   '2026-08-20'),
    ('E00007', 'WEB.QA.TEST.UNIT',      'INITIE',   '2026-08-20'),
    ('E00007', 'WEB.QA.SEC.OWASP',      'INITIE',   '2026-08-20'),
    ('E00007', 'WEB.UX.A11Y.WCAG',      'DEBUTANT', '2026-05-05'),
    -- ENS901 Salma Ben Youssef — DEPT_INFO, cadre de pilotage : exigences du département élevées (N4-N5)
    ('ENS901', 'S.INFO.PYTHON',   'CONFIRME',  '2026-01-10'),
    ('ENS901', 'S.INFO.SQLADV',   'CONFIRME',  '2026-01-10'),
    ('ENS901', 'S.INFO.ALGO',     'INITIE',    '2026-04-22'),
    ('ENS901', 'S.INFO.JAVAOOP',  'INITIE',    '2026-04-22'),
    -- ANI001 Nadia CHEBBI — sans département, DevOps / conteneurisation
    ('ANI001', 'S.DEVOPS.DOCKER', 'N5_EXPERT', '2026-02-28'),
    ('ANI001', 'S.DEVOPS.CICD',   'AVANCE',    '2026-02-28'),
    ('ANI001', 'S.CLOUD.K8S',     'AVANCE',    '2026-06-12'),
    ('ANI001', 'S.SYS.LINUX',     'AVANCE',    '2026-06-12'),
    ('ANI001', 'S.SYS.ANSIBLE',   'CONFIRME',  '2026-06-12'),
    -- ENS900 Animateur Test — compte de test sans département, informatique générale
    ('ENS900', 'S.INFO.PYTHON',   'INITIE',    '2026-03-01'),
    ('ENS900', 'S.SYS.LINUX',     'INITIE',    '2026-03-01'),
    ('ENS900', 'S.API.REST',      'DEBUTANT',  '2026-03-01')
) AS t(enseignant_id, savoir_code, niveau, date_acquisition)
JOIN savoirs s ON s.code = t.savoir_code
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
