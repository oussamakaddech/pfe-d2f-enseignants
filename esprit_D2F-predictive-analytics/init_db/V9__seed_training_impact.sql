-- ============================================================
-- V9__seed_training_impact.sql
-- Peuple les training_paths et training_path_items pour ENS* teachers
-- avec des items "déjà suivis" afin que l'Impact des formations
-- affiche des données réelles dans le dashboard.
-- ============================================================

SET search_path = "analyse", "formation", "competence", "besoin", "evaluation", "certificat", "auth", "public";

-- ── Nettoyage (idempotent) ──────────────────────────────────
DELETE FROM "analyse".training_path_items WHERE training_path_id IN (
    SELECT id FROM "analyse".training_paths WHERE enseignant_id LIKE 'ENS%'
);
DELETE FROM "analyse".training_paths WHERE enseignant_id LIKE 'ENS%';

-- ── 1. Training Paths pour les enseignants ENS* ─────────────
INSERT INTO "analyse".training_paths
  (enseignant_id, competence_id, competence_nom, niveau_depart, niveau_vise, nb_formations,
   duree_totale_heures, probabilite_reussite_globale, statut, created_at)
VALUES
  -- ENS001 : Backend (gap critique) + Architecture
  ('ENS001', 2, 'Developpement Backend', 4, 8, 2, 32, 0.82, 'EN_COURS', now() - interval '3 months'),
  ('ENS001', 4, 'Architecture logicielle', 3, 7, 2, 24, 0.78, 'EN_COURS', now() - interval '2 months'),
  -- ENS003 : Qualite et Tests (gap critique)
  ('ENS003', 6, 'Qualite et Tests', 1, 9, 3, 48, 0.75, 'EN_COURS', now() - interval '4 months'),
  -- ENS005 : Backend + Frontend
  ('ENS005', 2, 'Developpement Backend', 3, 8, 2, 32, 0.80, 'EN_COURS', now() - interval '2 months'),
  ('ENS005', 3, 'Developpement Frontend', 2, 8, 2, 32, 0.77, 'EN_COURS', now() - interval '1 months'),
  -- ENS011 : Infrastructure et Cloud (gap critique)
  ('ENS011', 9, 'Infrastructure et Cloud', 1, 9, 3, 48, 0.72, 'EN_COURS', now() - interval '5 months'),
  -- ENS023 : Deep Learning (gap critique) + Machine Learning
  ('ENS023', 11, 'Deep Learning', 1, 9, 3, 48, 0.68, 'EN_COURS', now() - interval '3 months'),
  ('ENS023', 10, 'Machine Learning', 3, 8, 2, 32, 0.75, 'EN_COURS', now() - interval '2 months'),
  -- ENS022 : Machine Learning
  ('ENS022', 10, 'Machine Learning', 2, 9, 2, 32, 0.78, 'EN_COURS', now() - interval '2 months'),
  -- ENS008 : Backend (gap critique)
  ('ENS008', 2, 'Developpement Backend', 2, 8, 2, 32, 0.80, 'EN_COURS', now() - interval '3 months'),
  -- ENS018 : Frontend (gap critique)
  ('ENS018', 3, 'Developpement Frontend', 2, 9, 2, 32, 0.76, 'EN_COURS', now() - interval '2 months'),
  -- ENS020 : Backend (gap critique)
  ('ENS020', 2, 'Developpement Backend', 2, 8, 2, 32, 0.80, 'EN_COURS', now() - interval '1 months');

-- ── 2. Training Path Items (formations réelles) ────────────
-- ENS001 : Backend
INSERT INTO "analyse".training_path_items
  (training_path_id, formation_id, formation_titre, formation_type, duree_heures, rang,
   est_obligatoire, prerequis_competences, niveau_avant, niveau_apres, prerequis_satisfaits,
   deja_suivie, score_formation, justification)
VALUES
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS001' AND competence_id=2),
   1, 'Atelier Spring Boot 3 & JPA Avance', 'INTERNE', 16, 1, true, '[]'::jsonb, 4, 6, true, true, 0.88, 'Renforcer le backend'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS001' AND competence_id=2),
   2, 'Securite Web et OWASP Top 10', 'INTERNE', 16, 2, false, '[]'::jsonb, 6, 8, true, true, 0.85, 'Monter en maturite');

-- ENS001 : Architecture
INSERT INTO "analyse".training_path_items
  (training_path_id, formation_id, formation_titre, formation_type, duree_heures, rang,
   est_obligatoire, prerequis_competences, niveau_avant, niveau_apres, prerequis_satisfaits,
   deja_suivie, score_formation, justification)
VALUES
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS001' AND competence_id=4),
   5, 'Architecture Microservices et Domain-Driven Design', 'INTERNE', 12, 1, true, '[]'::jsonb, 3, 5, true, true, 0.82, 'Ameliorer l''architecture'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS001' AND competence_id=4),
   6, 'Design Patterns Avances', 'INTERNE', 12, 2, false, '[]'::jsonb, 5, 7, true, false, 0.78, 'Complément');

-- ENS003 : Qualite et Tests (3 items, 2 deja suivis)
INSERT INTO "analyse".training_path_items
  (training_path_id, formation_id, formation_titre, formation_type, duree_heures, rang,
   est_obligatoire, prerequis_competences, niveau_avant, niveau_apres, prerequis_satisfaits,
   deja_suivie, score_formation, justification)
VALUES
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS003' AND competence_id=6),
   10, 'TDD et Tests Unitaires avec JUnit 5', 'INTERNE', 16, 1, true, '[]'::jsonb, 1, 4, true, true, 0.90, 'Base fundamentale'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS003' AND competence_id=6),
   11, 'Tests d''Integration et End-to-End', 'INTERNE', 16, 2, false, '[]'::jsonb, 4, 7, true, true, 0.85, 'Etape suivante'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS003' AND competence_id=6),
   12, 'CI/CD et Qualite Logicielle', 'INTERNE', 16, 3, false, '[]'::jsonb, 7, 9, false, false, 0.78, 'Niveau expert');

-- ENS005 : Backend
INSERT INTO "analyse".training_path_items
  (training_path_id, formation_id, formation_titre, formation_type, duree_heures, rang,
   est_obligatoire, prerequis_competences, niveau_avant, niveau_apres, prerequis_satisfaits,
   deja_suivie, score_formation, justification)
VALUES
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS005' AND competence_id=2),
   1, 'Atelier Spring Boot 3 & JPA Avance', 'INTERNE', 16, 1, true, '[]'::jsonb, 3, 5, true, true, 0.85, 'Renforcer le backend'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS005' AND competence_id=2),
   15, 'Microservices avec Spring Cloud', 'INTERNE', 16, 2, false, '[]'::jsonb, 5, 8, true, false, 0.80, 'Architecture distribuee');

-- ENS005 : Frontend
INSERT INTO "analyse".training_path_items
  (training_path_id, formation_id, formation_titre, formation_type, duree_heures, rang,
   est_obligatoire, prerequis_competences, niveau_avant, niveau_apres, prerequis_satisfaits,
   deja_suivie, score_formation, justification)
VALUES
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS005' AND competence_id=3),
   24, 'Formation React Avance', 'INTERNE', 16, 1, true, '[]'::jsonb, 2, 5, true, true, 0.87, 'Monter en gamme frontend'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS005' AND competence_id=3),
   25, 'TypeScript et Architecture Frontend', 'INTERNE', 16, 2, false, '[]'::jsonb, 5, 8, true, false, 0.82, 'Complement');

-- ENS011 : Infrastructure et Cloud (3 items, 2 deja suivis)
INSERT INTO "analyse".training_path_items
  (training_path_id, formation_id, formation_titre, formation_type, duree_heures, rang,
   est_obligatoire, prerequis_competences, niveau_avant, niveau_apres, prerequis_satisfaits,
   deja_suivie, score_formation, justification)
VALUES
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS011' AND competence_id=9),
   30, 'AWS Fundamentals', 'EXTERNE', 16, 1, true, '[]'::jsonb, 1, 4, true, true, 0.88, 'Base cloud'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS011' AND competence_id=9),
   31, 'Docker et Kubernetes', 'INTERNE', 16, 2, false, '[]'::jsonb, 4, 7, true, true, 0.85, 'Conteneurisation'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS011' AND competence_id=9),
   32, 'Architecture Cloud-Native', 'EXTERNE', 16, 3, false, '[]'::jsonb, 7, 9, false, false, 0.78, 'Niveau expert');

-- ENS023 : Deep Learning (2 deja suivis)
INSERT INTO "analyse".training_path_items
  (training_path_id, formation_id, formation_titre, formation_type, duree_heures, rang,
   est_obligatoire, prerequis_competences, niveau_avant, niveau_apres, prerequis_satisfaits,
   deja_suivie, score_formation, justification)
VALUES
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS023' AND competence_id=11),
   40, 'Introduction au Deep Learning', 'EXTERNE', 16, 1, true, '[]'::jsonb, 1, 3, true, true, 0.82, 'Fondamentaux'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS023' AND competence_id=11),
   41, 'CNN et Vision par Ordinateur', 'EXTERNE', 16, 2, false, '[]'::jsonb, 3, 6, true, true, 0.78, 'Specialisation vision'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS023' AND competence_id=11),
   42, 'NLP et Transformers', 'EXTERNE', 16, 3, false, '[]'::jsonb, 6, 9, false, false, 0.72, 'NLP avance');

-- ENS023 : Machine Learning (1 deja suivi)
INSERT INTO "analyse".training_path_items
  (training_path_id, formation_id, formation_titre, formation_type, duree_heures, rang,
   est_obligatoire, prerequis_competences, niveau_avant, niveau_apres, prerequis_satisfaits,
   deja_suivie, score_formation, justification)
VALUES
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS023' AND competence_id=10),
   3, 'Introduction au Machine Learning avec Python', 'EXTERNE', 16, 1, true, '[]'::jsonb, 3, 5, true, true, 0.85, 'Renforcement ML'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS023' AND competence_id=10),
   43, 'Scikit-learn et Modeles Avances', 'EXTERNE', 16, 2, false, '[]'::jsonb, 5, 8, true, false, 0.80, 'Approfondissement');

-- ENS022 : Machine Learning (1 deja suivi)
INSERT INTO "analyse".training_path_items
  (training_path_id, formation_id, formation_titre, formation_type, duree_heures, rang,
   est_obligatoire, prerequis_competences, niveau_avant, niveau_apres, prerequis_satisfaits,
   deja_suivie, score_formation, justification)
VALUES
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS022' AND competence_id=10),
   3, 'Introduction au Machine Learning avec Python', 'EXTERNE', 16, 1, true, '[]'::jsonb, 2, 4, true, true, 0.85, 'Base ML'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS022' AND competence_id=10),
   44, 'ML Production et MLOps', 'INTERNE', 16, 2, false, '[]'::jsonb, 4, 9, true, false, 0.82, 'Production');

-- ENS008 : Backend (1 deja suivi)
INSERT INTO "analyse".training_path_items
  (training_path_id, formation_id, formation_titre, formation_type, duree_heures, rang,
   est_obligatoire, prerequis_competences, niveau_avant, niveau_apres, prerequis_satisfaits,
   deja_suivie, score_formation, justification)
VALUES
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS008' AND competence_id=2),
   1, 'Atelier Spring Boot 3 & JPA Avance', 'INTERNE', 16, 1, true, '[]'::jsonb, 2, 5, true, true, 0.88, 'Renforcer le backend'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS008' AND competence_id=2),
   45, 'API REST et GraphQL', 'INTERNE', 16, 2, false, '[]'::jsonb, 5, 8, true, false, 0.82, 'Complement');

-- ENS018 : Frontend (1 deja suivi)
INSERT INTO "analyse".training_path_items
  (training_path_id, formation_id, formation_titre, formation_type, duree_heures, rang,
   est_obligatoire, prerequis_competences, niveau_avant, niveau_apres, prerequis_satisfaits,
   deja_suivie, score_formation, justification)
VALUES
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS018' AND competence_id=3),
   24, 'Formation React Avance', 'INTERNE', 16, 1, true, '[]'::jsonb, 2, 5, true, true, 0.87, 'Monter en gamme frontend'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS018' AND competence_id=3),
   46, 'Next.js et SSR', 'INTERNE', 16, 2, false, '[]'::jsonb, 5, 9, true, false, 0.82, 'SSR/SSG');

-- ENS020 : Backend (1 deja suivi)
INSERT INTO "analyse".training_path_items
  (training_path_id, formation_id, formation_titre, formation_type, duree_heures, rang,
   est_obligatoire, prerequis_competences, niveau_avant, niveau_apres, prerequis_satisfaits,
   deja_suivie, score_formation, justification)
VALUES
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS020' AND competence_id=2),
   1, 'Atelier Spring Boot 3 & JPA Avance', 'INTERNE', 16, 1, true, '[]'::jsonb, 2, 5, true, true, 0.88, 'Backend fondamental'),
  ((SELECT id FROM "analyse".training_paths WHERE enseignant_id='ENS020' AND competence_id=2),
   47, 'Hibernate Avance et Performance', 'INTERNE', 16, 2, false, '[]'::jsonb, 5, 8, true, false, 0.82, 'ORM avance');

-- ── 3. Mettre a jour les precedents scores pour montrer l'impact ──
-- ENS001: risque baisse de 0.42 → 0.28 (amelioration)
-- ENS003: risque baisse de 0.55 → 0.42 (amelioration)
-- ENS005: risque baisse de 0.48 → 0.38 (amelioration)
-- ENS011: risque baisse de 0.65 → 0.52 (amelioration)
-- ENS023: risque baisse de 0.72 → 0.58 (amelioration)
-- ENS008: risque baisse de 0.40 → 0.30 (amelioration)
-- ENS018: risque baisse de 0.45 → 0.35 (amelioration)
-- ENS020: risque baisse de 0.48 → 0.38 (amelioration)
UPDATE "analyse".teacher_risk_profiles SET
  precedent_score_risque = 0.42, tendance = 'PROGRESSION'
  WHERE enseignant_id = 'ENS001';
UPDATE "analyse".teacher_risk_profiles SET
  precedent_score_risque = 0.55, tendance = 'PROGRESSION'
  WHERE enseignant_id = 'ENS003';
UPDATE "analyse".teacher_risk_profiles SET
  precedent_score_risque = 0.48, tendance = 'PROGRESSION'
  WHERE enseignant_id = 'ENS005';
UPDATE "analyse".teacher_risk_profiles SET
  precedent_score_risque = 0.65, tendance = 'PROGRESSION'
  WHERE enseignant_id = 'ENS011';
UPDATE "analyse".teacher_risk_profiles SET
  precedent_score_risque = 0.72, tendance = 'PROGRESSION'
  WHERE enseignant_id = 'ENS023';
UPDATE "analyse".teacher_risk_profiles SET
  precedent_score_risque = 0.40, tendance = 'PROGRESSION'
  WHERE enseignant_id = 'ENS008';
UPDATE "analyse".teacher_risk_profiles SET
  precedent_score_risque = 0.45, tendance = 'PROGRESSION'
  WHERE enseignant_id = 'ENS018';
UPDATE "analyse".teacher_risk_profiles SET
  precedent_score_risque = 0.48, tendance = 'PROGRESSION'
  WHERE enseignant_id = 'ENS020';

-- Quelques-uns avec regression (pour montrer nb_risque_augmente)
UPDATE "analyse".teacher_risk_profiles SET
  precedent_score_risque = 0.20, tendance = 'REGRESSION'
  WHERE enseignant_id = 'ENS014';
UPDATE "analyse".teacher_risk_profiles SET
  precedent_score_risque = 0.22, tendance = 'REGRESSION'
  WHERE enseignant_id = 'ENS016';
UPDATE "analyse".teacher_risk_profiles SET
  precedent_score_risque = 0.18, tendance = 'REGRESSION'
  WHERE enseignant_id = 'ENS017';

-- Purger le cache pour forcer le recalcul
DELETE FROM "analyse".dashboard_snapshots;

SELECT 'V9 — Training impact seed applied successfully' AS status;
