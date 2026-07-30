-- Clean ALL alerts and re-insert a clean set spread across 6 months
DELETE FROM "analyse".alert_events;

-- Jan 2026 (3 alerts)
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, departement_id, competence_id, severite, titre, message, details_json, statut, created_at) VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS003', 'DEPT_INFO', 6, 'CRITICAL', 'Gap critique - Qualite et Tests', 'Niveau actuel 2 / requis 9.', '{"ecart":7}'::jsonb, 'TRAITEE', '2026-01-10'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS001', 'DEPT_RT', 2, 'WARNING', 'Stagnation - Backend', 'Aucune formation validee depuis 3 mois.', '{"mois":3}'::jsonb, 'TRAITEE', '2026-01-15'),
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'ENS005', 'DEPT_GL', 3, 'WARNING', 'Completion faible - Frontend', 'Taux de completion a 40%.', '{"taux":0.40}'::jsonb, 'TRAITEE', '2026-01-20');

-- Feb 2026 (3 alerts)
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, departement_id, competence_id, severite, titre, message, details_json, statut, created_at) VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS011', 'DEPT_RT', 9, 'CRITICAL', 'Gap critique - Infrastructure et Cloud', 'Niveau actuel 2 / requis 9.', '{"ecart":7}'::jsonb, 'TRAITEE', '2026-02-08'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS023', 'DEPT_IA', 11, 'CRITICAL', 'Gap critique - Deep Learning', 'Niveau actuel 2 / requis 9.', '{"ecart":7}'::jsonb, 'TRAITEE', '2026-02-12'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS002', 'DEPT_GL', 4, 'WARNING', 'Stagnation - Architecture', 'Stagnation detectee depuis 4 mois.', '{"mois":4}'::jsonb, 'TRAITEE', '2026-02-18');

-- Mar 2026 (3 alerts)
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, departement_id, competence_id, severite, titre, message, details_json, statut, created_at) VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS013', 'DEPT_RT', 8, 'CRITICAL', 'Gap critique - Reseaux et Systemes', 'Niveau actuel 3 / requis 9.', '{"ecart":6}'::jsonb, 'TRAITEE', '2026-03-05'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS002', 'DEPT_GL', 4, 'CRITICAL', 'Gap critique - Architecture logicielle', 'Niveau actuel 3 / requis 8.', '{"ecart":5}'::jsonb, 'TRAITEE', '2026-03-12'),
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'ENS018', 'DEPT_WEB', 3, 'WARNING', 'Completion faible - Frontend', 'Taux de completion a 45%.', '{"taux":0.45}'::jsonb, 'TRAITEE', '2026-03-20');

-- Apr 2026 (2 alerts)
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, departement_id, competence_id, severite, titre, message, details_json, statut, created_at) VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS005', 'DEPT_GL', 3, 'CRITICAL', 'Gap critique - Developpement Frontend', 'Niveau actuel 3 / requis 8.', '{"ecart":5}'::jsonb, 'TRAITEE', '2026-04-10'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS003', 'DEPT_INFO', 6, 'WARNING', 'Stagnation - Qualite et Tests', 'Stagnation detectee depuis 5 mois.', '{"mois":5}'::jsonb, 'TRAITEE', '2026-04-18');

-- May 2026 (3 alerts)
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, departement_id, competence_id, severite, titre, message, details_json, statut, created_at) VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS008', 'DEPT_INFO', 2, 'CRITICAL', 'Gap critique - Developpement Backend', 'Niveau actuel 3 / requis 8.', '{"ecart":5}'::jsonb, 'TRAITEE', '2026-05-08'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS011', 'DEPT_RT', 9, 'WARNING', 'Stagnation - Infrastructure et Cloud', 'Stagnation detectee depuis 6 mois.', '{"mois":6}'::jsonb, 'LUE', '2026-05-15'),
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'ENS022', 'DEPT_IA', 10, 'WARNING', 'Completion faible - Machine Learning', 'Taux de completion a 42%.', '{"taux":0.42}'::jsonb, 'LUE', '2026-05-22');

-- Jun 2026 (3 alerts)
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, departement_id, competence_id, severite, titre, message, details_json, statut, created_at) VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS023', 'DEPT_IA', 11, 'CRITICAL', 'Gap critique - Deep Learning', 'Niveau actuel 2 / requis 9.', '{"ecart":7}'::jsonb, 'ACTIVE', '2026-06-05'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS010', 'DEPT_RT', 7, 'CRITICAL', 'Gap critique - Securite Applicative', 'Niveau actuel 3 / requis 8.', '{"ecart":5}'::jsonb, 'ACTIVE', '2026-06-15'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS005', 'DEPT_GL', 3, 'WARNING', 'Stagnation - Developpement Frontend', 'Stagnation detectee depuis 5 mois.', '{"mois":5}'::jsonb, 'ACTIVE', '2026-06-22');

-- Jul 2026 (5 alerts)
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, departement_id, competence_id, severite, titre, message, details_json, statut, created_at) VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS003', 'DEPT_INFO', 6, 'CRITICAL', 'Gap critique - Qualite et Tests', 'Niveau actuel 1 / requis 9.', '{"ecart":8}'::jsonb, 'NOUVELLE', now() - interval '7 days'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS011', 'DEPT_RT', 9, 'CRITICAL', 'Gap critique - Infrastructure et Cloud', 'Niveau actuel 1 / requis 9.', '{"ecart":8}'::jsonb, 'NOUVELLE', now() - interval '5 days'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS023', 'DEPT_IA', 11, 'CRITICAL', 'Gap critique - Deep Learning', 'Niveau actuel 1 / requis 9.', '{"ecart":8}'::jsonb, 'NOUVELLE', now() - interval '3 days'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS001', 'DEPT_RT', 2, 'WARNING', 'Stagnation - Developpement Backend', 'Aucune formation validee depuis 6 mois.', '{"mois":6}'::jsonb, 'ACTIVE', now() - interval '10 days'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS005', 'DEPT_GL', 3, 'WARNING', 'Stagnation - Developpement Frontend', 'Aucune progression detectee.', '{"mois":5}'::jsonb, 'ACTIVE', now() - interval '12 days');

-- Verify
SELECT to_char(created_at, 'YYYY-MM') AS month, severite, COUNT(*)
FROM "analyse".alert_events
GROUP BY to_char(created_at, 'YYYY-MM'), severite
ORDER BY month, severite;
