-- V14 : rattache les départements manquants au référentiel de compétences.
--
-- Contexte : competence.domaines ne couvrait que 5 départements (GL, RT, IA,
-- INF2, INFO). Les enseignants de Génie Civil (DEPT_GC / UP_GC) et de
-- Développement Web (DEPT_WEB / UP_WEB) obtenaient un périmètre vide
-- (0 compétence → 0 gap, 0 recommandation) sur scope-analysis, alors que
-- l'endpoint risk calculait sur le référentiel global (incohérence).
--
-- Idempotent et réexécutable : ON CONFLICT (code) DO NOTHING + UPDATE de
-- rattachement si les colonnes up_id / departement_id sont vides.
INSERT INTO domaines (code, nom, description, actif, created_at, created_by, version, up_id, departement_id) VALUES
    ('GC',  'Génie Civil',      'BTP, structures, matériaux de construction', true, NOW(), 'migration', 0, 'UP_GC', 'DEPT_GC'),
    ('WEB', 'Développement Web', 'Applications web, frontend, backend web',   true, NOW(), 'migration', 0, 'UP_WEB', 'DEPT_WEB')
ON CONFLICT (code) DO NOTHING;

UPDATE domaines SET up_id = 'UP_GC', departement_id = 'DEPT_GC'
WHERE code = 'GC' AND (up_id IS NULL OR departement_id IS NULL);

UPDATE domaines SET up_id = 'UP_WEB', departement_id = 'DEPT_WEB'
WHERE code = 'WEB' AND (up_id IS NULL OR departement_id IS NULL);

SELECT setval('competence.domaines_id_seq', (SELECT max(id) FROM competence.domaines))
WHERE EXISTS (SELECT 1 FROM competence.domaines);
