-- Fix declining competencies: add old skill_gaps from 6 months ago with higher levels
-- The function compares recent (30 days) vs old (6 months ±30 days) niveau_actuel
-- If current average < old average - 0.3, it's flagged as declining

-- Old data from ~6 months ago (Jan 2026) with slightly higher niveau_actuel
-- GL dept
INSERT INTO "analyse".skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at) VALUES
    ('ENS001', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 6, 8, 3, 0.25, 0.30, 0.20, 0.25, 'FAIBLE', 0, FALSE, 0, '2026-01-15'),
    ('ENS002', 4, 'C4', 'Architecture logicielle', 1, 'Genie Logiciel', 4, 8, 3, 0.50, 0.50, 0.45, 0.48, 'MODEREE', 0, FALSE, 0, '2026-01-15'),
    ('ENS003', 6, 'C6', 'Qualite et Tests', 1, 'Genie Logiciel', 3, 9, 3, 0.67, 0.60, 0.55, 0.60, 'HAUTE', 0, FALSE, 0, '2026-01-15'),
    ('ENS005', 3, 'C3', 'Developpement Frontend', 1, 'Genie Logiciel', 4, 8, 3, 0.50, 0.40, 0.35, 0.42, 'MODEREE', 0, FALSE, 0, '2026-01-15');

-- INFO dept
INSERT INTO "analyse".skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at) VALUES
    ('ENS006', 5, 'C5', 'Bases de donnees', 2, 'Informatique', 4, 9, 3, 0.56, 0.50, 0.45, 0.50, 'MODEREE', 0, FALSE, 0, '2026-01-15'),
    ('ENS008', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 4, 8, 3, 0.50, 0.50, 0.45, 0.48, 'MODEREE', 0, FALSE, 0, '2026-01-15');

-- RT dept
INSERT INTO "analyse".skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at) VALUES
    ('ENS010', 7, 'C7', 'Securite applicative', 3, 'Reseaux', 4, 8, 3, 0.50, 0.50, 0.45, 0.48, 'MODEREE', 0, FALSE, 0, '2026-01-15'),
    ('ENS011', 9, 'C9', 'Infrastructure et Cloud', 3, 'Reseaux', 3, 9, 3, 0.67, 0.60, 0.55, 0.60, 'HAUTE', 0, FALSE, 0, '2026-01-15'),
    ('ENS013', 8, 'C8', 'Reseaux et Systemes', 3, 'Reseaux', 4, 9, 3, 0.56, 0.50, 0.45, 0.50, 'MODEREE', 0, FALSE, 0, '2026-01-15');

-- IA dept
INSERT INTO "analyse".skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at) VALUES
    ('ENS023', 11, 'C11', 'Deep Learning', 4, 'Intelligence Artificielle', 3, 9, 3, 0.67, 0.60, 0.55, 0.60, 'HAUTE', 0, FALSE, 0, '2026-01-15'),
    ('ENS022', 10, 'C10', 'Machine Learning', 4, 'Intelligence Artificielle', 4, 9, 3, 0.56, 0.50, 0.45, 0.50, 'MODEREE', 0, FALSE, 0, '2026-01-15');

-- WEB dept
INSERT INTO "analyse".skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at) VALUES
    ('ENS018', 3, 'C3', 'Developpement Frontend', 1, 'Genie Logiciel', 4, 9, 3, 0.56, 0.50, 0.45, 0.50, 'MODEREE', 0, FALSE, 0, '2026-01-15'),
    ('ENS020', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 4, 8, 3, 0.50, 0.50, 0.45, 0.48, 'MODEREE', 0, FALSE, 0, '2026-01-15');

-- GC dept
INSERT INTO "analyse".skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at) VALUES
    ('ENS014', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 6, 8, 3, 0.25, 0.30, 0.25, 0.27, 'FAIBLE', 0, FALSE, 0, '2026-01-15'),
    ('ENS016', 3, 'C3', 'Developpement Frontend', 1, 'Genie Logiciel', 6, 7, 3, 0.14, 0.20, 0.15, 0.17, 'FAIBLE', 0, FALSE, 0, '2026-01-15');

-- Second batch (March 2026)
INSERT INTO "analyse".skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at) VALUES
    ('ENS001', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 5, 8, 3, 0.38, 0.40, 0.35, 0.38, 'MODEREE', 0, FALSE, 0, '2026-03-15'),
    ('ENS002', 4, 'C4', 'Architecture logicielle', 1, 'Genie Logiciel', 3, 8, 3, 0.63, 0.55, 0.50, 0.56, 'HAUTE', 0, FALSE, 0, '2026-03-15'),
    ('ENS003', 6, 'C6', 'Qualite et Tests', 1, 'Genie Logiciel', 2, 9, 3, 0.78, 0.70, 0.65, 0.71, 'CRITIQUE', 0, FALSE, 0, '2026-03-15'),
    ('ENS005', 3, 'C3', 'Developpement Frontend', 1, 'Genie Logiciel', 3, 8, 3, 0.63, 0.50, 0.45, 0.53, 'HAUTE', 0, FALSE, 0, '2026-03-15'),
    ('ENS011', 9, 'C9', 'Infrastructure et Cloud', 3, 'Reseaux', 2, 9, 3, 0.78, 0.70, 0.65, 0.71, 'CRITIQUE', 0, FALSE, 0, '2026-03-15'),
    ('ENS023', 11, 'C11', 'Deep Learning', 4, 'Intelligence Artificielle', 2, 9, 3, 0.78, 0.70, 0.65, 0.71, 'CRITIQUE', 0, FALSE, 0, '2026-03-15'),
    ('ENS013', 8, 'C8', 'Reseaux et Systemes', 3, 'Reseaux', 3, 9, 3, 0.67, 0.55, 0.50, 0.57, 'HAUTE', 0, FALSE, 0, '2026-03-15'),
    ('ENS018', 3, 'C3', 'Developpement Frontend', 1, 'Genie Logiciel', 3, 9, 3, 0.67, 0.55, 0.50, 0.57, 'HAUTE', 0, FALSE, 0, '2026-03-15');

-- Fix risk evolution: spread alerts across 6 months
DELETE FROM "analyse".alert_events;

-- Jan 2026
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, departement_id, competence_id, severite, titre, message, details_json, statut, created_at) VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS003', 'DEPT_INFO', 6, 'CRITICAL', 'Gap critique - Qualite', 'Niveau actuel 2 / requis 9.', '{"ecart":7}'::jsonb, 'TRAITEE', '2026-01-10'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS001', 'DEPT_RT', 2, 'WARNING', 'Stagnation - Backend', 'Aucune formation.', '{"mois":3}'::jsonb, 'TRAITEE', '2026-01-15'),
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'ENS005', 'DEPT_GL', 3, 'WARNING', 'Completion faible', 'Taux 40%.', '{"taux":0.4}'::jsonb, 'TRAITEE', '2026-01-20');

-- Feb 2026
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, departement_id, competence_id, severite, titre, message, details_json, statut, created_at) VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS011', 'DEPT_RT', 9, 'CRITICAL', 'Gap critique - Cloud', 'Niveau 2 / requis 9.', '{"ecart":7}'::jsonb, 'TRAITEE', '2026-02-08'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS023', 'DEPT_IA', 11, 'CRITICAL', 'Gap critique - DL', 'Niveau 2 / requis 9.', '{"ecart":7}'::jsonb, 'TRAITEE', '2026-02-12'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS002', 'DEPT_GL', 4, 'WARNING', 'Stagnation - Archi', 'Stagnation 4 mois.', '{"mois":4}'::jsonb, 'TRAITEE', '2026-02-18');

-- Mar 2026
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, departement_id, competence_id, severite, titre, message, details_json, statut, created_at) VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS013', 'DEPT_RT', 8, 'CRITICAL', 'Gap critique - Reseaux', 'Niveau 3 / requis 9.', '{"ecart":6}'::jsonb, 'TRAITEE', '2026-03-05'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS002', 'DEPT_GL', 4, 'CRITICAL', 'Gap critique - Archi', 'Niveau 3 / requis 8.', '{"ecart":5}'::jsonb, 'TRAITEE', '2026-03-12'),
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'ENS018', 'DEPT_WEB', 3, 'WARNING', 'Completion faible', 'Taux 45%.', '{"taux":0.45}'::jsonb, 'TRAITEE', '2026-03-20');

-- Apr 2026
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, departement_id, competence_id, severite, titre, message, details_json, statut, created_at) VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS005', 'DEPT_GL', 3, 'CRITICAL', 'Gap critique - Frontend', 'Niveau 3 / requis 8.', '{"ecart":5}'::jsonb, 'TRAITEE', '2026-04-10'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS003', 'DEPT_INFO', 6, 'WARNING', 'Stagnation - Tests', 'Stagnation 5 mois.', '{"mois":5}'::jsonb, 'TRAITEE', '2026-04-18');

-- May 2026
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, departement_id, competence_id, severite, titre, message, details_json, statut, created_at) VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS008', 'DEPT_INFO', 2, 'CRITICAL', 'Gap critique - Backend', 'Niveau 3 / requis 8.', '{"ecart":5}'::jsonb, 'TRAITEE', '2026-05-08'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS011', 'DEPT_RT', 9, 'WARNING', 'Stagnation - Cloud', 'Stagnation 6 mois.', '{"mois":6}'::jsonb, 'LUE', '2026-05-15'),
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'ENS022', 'DEPT_IA', 10, 'WARNING', 'Completion faible', 'Taux 42%.', '{"taux":0.42}'::jsonb, 'LUE', '2026-05-22');

-- Jun 2026
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, departement_id, competence_id, severite, titre, message, details_json, statut, created_at) VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS023', 'DEPT_IA', 11, 'CRITICAL', 'Gap critique - DL', 'Niveau 2 / requis 9.', '{"ecart":7}'::jsonb, 'ACTIVE', '2026-06-05'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS010', 'DEPT_RT', 7, 'CRITICAL', 'Gap critique - Securite', 'Niveau 3 / requis 8.', '{"ecart":5}'::jsonb, 'ACTIVE', '2026-06-15'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS005', 'DEPT_GL', 3, 'WARNING', 'Stagnation - Frontend', 'Stagnation 5 mois.', '{"mois":5}'::jsonb, 'ACTIVE', '2026-06-22');

-- Jul 2026 (current)
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, departement_id, competence_id, severite, titre, message, details_json, statut, created_at) VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS003', 'DEPT_INFO', 6, 'CRITICAL', 'Gap critique - Qualite', 'Niveau 1 / requis 9.', '{"ecart":8}'::jsonb, 'NOUVELLE', now() - interval '7 days'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS011', 'DEPT_RT', 9, 'CRITICAL', 'Gap critique - Cloud', 'Niveau 1 / requis 9.', '{"ecart":8}'::jsonb, 'NOUVELLE', now() - interval '5 days'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS023', 'DEPT_IA', 11, 'CRITICAL', 'Gap critique - DL', 'Niveau 1 / requis 9.', '{"ecart":8}'::jsonb, 'NOUVELLE', now() - interval '3 days'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS001', 'DEPT_RT', 2, 'WARNING', 'Stagnation - Backend', 'Aucune formation validee depuis 6 mois.', '{"mois":6}'::jsonb, 'ACTIVE', now() - interval '10 days'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS005', 'DEPT_GL', 3, 'WARNING', 'Stagnation - Frontend', 'Aucune progression detectee.', '{"mois":5}'::jsonb, 'ACTIVE', now() - interval '12 days'),
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'ENS022', 'DEPT_IA', 10, 'WARNING', 'Completion insuffisant', 'Taux de completion faible.', '{"taux":0.51}'::jsonb, 'ACTIVE', now() - interval '15 days'),
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'ENS018', 'DEPT_WEB', 3, 'WARNING', 'Completion insuffisant', 'Taux de completion faible.', '{"taux":0.56}'::jsonb, 'ACTIVE', now() - interval '18 days');

SELECT 'Historical data applied' AS status;
SELECT 'Alerts by month:' AS info;
SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*) AS alert_count
FROM "analyse".alert_events
GROUP BY to_char(created_at, 'YYYY-MM')
ORDER BY month;

SELECT 'Declining candidates (old vs recent gaps):' AS info;
SELECT competence_id, competence_nom,
  ROUND(AVG(CASE WHEN computed_at < '2026-04-01' THEN niveau_actuel END), 2) AS old_avg,
  ROUND(AVG(CASE WHEN computed_at >= '2026-06-22' THEN niveau_actuel END), 2) AS recent_avg
FROM "analyse".skill_gaps
GROUP BY competence_id, competence_nom
HAVING AVG(CASE WHEN computed_at < '2026-04-01' THEN niveau_actuel END) IS NOT NULL
   AND AVG(CASE WHEN computed_at >= '2026-06-22' THEN niveau_actuel END) IS NOT NULL
ORDER BY (AVG(CASE WHEN computed_at >= '2026-06-22' THEN niveau_actuel END) - AVG(CASE WHEN computed_at < '2026-04-01' THEN niveau_actuel END));
