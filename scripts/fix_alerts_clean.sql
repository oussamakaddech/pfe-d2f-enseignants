-- Clean ALL old alerts and re-insert clean set
DELETE FROM "analyse".alert_events;

-- New clean alerts for the 27 teachers
INSERT INTO "analyse".alert_events
  (type_alerte, cible_type, enseignant_id, departement_id, competence_id,
   severite, titre, message, details_json, statut, created_at)
VALUES
  -- Critical gaps
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS003', 'DEPT_INFO', 6, 'CRITICAL',
   'Gap critique - Qualite et Tests', 'Niveau actuel 1 / requis 9.', '{"competence":"Qualite et Tests","ecart":8}'::jsonb, 'NOUVELLE', now() - interval '7 days'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS011', 'DEPT_RT', 9, 'CRITICAL',
   'Gap critique - Infrastructure et Cloud', 'Niveau actuel 1 / requis 9.', '{"competence":"Infrastructure et Cloud","ecart":8}'::jsonb, 'NOUVELLE', now() - interval '5 days'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS023', 'DEPT_IA', 11, 'CRITICAL',
   'Gap critique - Deep Learning', 'Niveau actuel 1 / requis 9.', '{"competence":"Deep Learning","ecart":8}'::jsonb, 'NOUVELLE', now() - interval '3 days'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS013', 'DEPT_RT', 8, 'CRITICAL',
   'Gap critique - Reseaux et Systemes', 'Niveau actuel 2 / requis 9.', '{"competence":"Reseaux et Systemes","ecart":7}'::jsonb, 'NOUVELLE', now() - interval '4 days'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS002', 'DEPT_GL', 4, 'CRITICAL',
   'Gap critique - Architecture logicielle', 'Niveau actuel 2 / requis 8.', '{"competence":"Architecture logicielle","ecart":6}'::jsonb, 'NOUVELLE', now() - interval '6 days'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS005', 'DEPT_GL', 3, 'CRITICAL',
   'Gap critique - Frontend', 'Niveau actuel 2 / requis 8.', '{"competence":"Developpement Frontend","ecart":6}'::jsonb, 'NOUVELLE', now() - interval '8 days'),
  -- Stagnation warnings
  ('STAGNATION', 'ENSEIGNANT', 'ENS001', 'DEPT_RT', 2, 'WARNING',
   'Stagnation - Backend', 'Aucune formation validee depuis 6 mois.', '{"mois_stagnation":6}'::jsonb, 'ACTIVE', now() - interval '10 days'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS005', 'DEPT_GL', 3, 'WARNING',
   'Stagnation - Frontend', 'Aucune progression detectee.', '{"mois_stagnation":5}'::jsonb, 'ACTIVE', now() - interval '12 days'),
  -- Completion warnings
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'ENS022', 'DEPT_IA', 10, 'WARNING',
   'Completion insuffisant - ML', 'Taux de completion faible.', '{"taux":0.51}'::jsonb, 'ACTIVE', now() - interval '15 days'),
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'ENS018', 'DEPT_WEB', 3, 'WARNING',
   'Completion insuffisant - Frontend', 'Taux de completion faible.', '{"taux":0.56}'::jsonb, 'ACTIVE', now() - interval '18 days'),
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'ENS011', 'DEPT_RT', 9, 'WARNING',
   'Completion insuffisant - Cloud', 'Taux de completion faible.', '{"taux":0.45}'::jsonb, 'ACTIVE', now() - interval '20 days');

SELECT 'Alerts cleaned' as status, COUNT(*) as alert_count FROM "analyse".alert_events;
