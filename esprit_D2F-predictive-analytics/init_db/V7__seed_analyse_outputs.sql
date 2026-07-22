-- =============================================================================
-- V7__seed_analyse_outputs.sql
-- Peuple les tables de sortie du schéma "analyse" avec des données réalistes
-- pour les 3 enseignants actifs (E00003, E00004, ENSTEST001). Idempotent.
-- =============================================================================

SET search_path = "analyse", "formation", "competence", "besoin", "evaluation", "certificat", "auth", "public";

-- ── Nettoyage (idempotence) ──────────────────────────────────────────────────
DELETE FROM "analyse"."teacher_risk_profiles" WHERE enseignant_id IN ('E00003', 'E00004', 'ENSTEST001');
DELETE FROM "analyse"."recommendations"      WHERE enseignant_id IN ('E00003', 'E00004', 'ENSTEST001');
DELETE FROM "analyse"."training_path_items"  WHERE training_path_id IN (
    SELECT id FROM "analyse"."training_paths" WHERE enseignant_id IN ('E00003','E00004','ENSTEST001'));
DELETE FROM "analyse"."training_paths"       WHERE enseignant_id IN ('E00003', 'E00004', 'ENSTEST001');
DELETE FROM "analyse"."alert_events";
DELETE FROM "analyse"."model_retraining_log";
DELETE FROM "analyse"."skill_gaps"
 WHERE computed_at < now() - interval '5 months'
   AND niveau_actuel = 5
   AND enseignant_id IN ('E00003', 'E00004');

-- ── 1. Profils de risque enseignant ──────────────────────────────────────────
INSERT INTO "analyse"."teacher_risk_profiles"
  (enseignant_id, score_risque, niveau_risque, nb_gaps_critiques, nb_gaps_moderes,
   nb_gaps_faibles, nb_mois_stagnation_max, tendance, taux_completion_formations,
   facteurs_risque, recommandations_urgentes, computed_at, precedent_score_risque)
VALUES
  ('E00003', 0.82, 'CRITIQUE', 2, 3, 1, 14, 'REGRESSION', 0.33,
   '[{"facteur":"Stagnation longue (>12 mois)","poids":0.35},{"facteur":"Gaps critiques","poids":0.30},{"facteur":"Faible complétion formation","poids":0.20}]'::jsonb,
   '["Sécurité Web OWASP","Spring Boot Avancé"]'::jsonb, now(), 0.55),
  ('E00004', 0.58, 'MODERE', 0, 2, 2, 8, 'STABLE', 0.50,
   '[{"facteur":"Stagnation moyenne","poids":0.25},{"facteur":"Quelques gaps modérés","poids":0.20}]'::jsonb,
   '["React Avancé"]'::jsonb, now(), 0.55),
  ('ENSTEST001', 0.34, 'FAIBLE', 0, 1, 4, 3, 'PROGRESSION', 0.75,
   '[{"facteur":"Peu de gaps","poids":0.15}]'::jsonb,
   '[]'::jsonb, now(), 0.40);

-- ── 2. Recommandations de formation ──────────────────────────────────────────
INSERT INTO "analyse"."recommendations"
  (enseignant_id, competence_id, skill_gap_id, formation_id, formation_titre, formation_type,
   score_pertinence, score_taux_reussite, score_disponibilite, score_global, probabilite_reussite,
   rang_dans_parcours, est_prerequis, prerequis_satisfaits, niveau_apres, statut, created_at)
VALUES
  ('E00003', 4, NULL, 2, 'Sécurité Web et OWASP Top 10', 'INTERNE', 0.92, 0.85, 0.90, 0.89, 0.88, 1, true, true, 4, 'PROPOSE', now()),
  ('E00003', 1, NULL, 1, 'Atelier Spring Boot 3 & JPA Avancé', 'INTERNE', 0.88, 0.80, 0.85, 0.84, 0.83, 2, false, true, 4, 'PROPOSE', now()),
  ('E00003', 6, NULL, 3, 'Introduction au Machine Learning avec Python', 'EXTERNE', 0.80, 0.70, 0.75, 0.75, 0.72, 3, false, false, 3, 'PROPOSE', now()),
  ('E00004', 2, NULL, 24, 'formation react', 'INTERNE', 0.85, 0.82, 0.88, 0.85, 0.84, 1, true, true, 4, 'PROPOSE', now()),
  ('E00004', 1, NULL, 1, 'Atelier Spring Boot 3 & JPA Avancé', 'INTERNE', 0.78, 0.76, 0.80, 0.78, 0.77, 2, false, true, 3, 'PROPOSE', now()),
  ('ENSTEST001', 6, NULL, 3, 'Introduction au Machine Learning avec Python', 'EXTERNE', 0.75, 0.72, 0.70, 0.72, 0.71, 1, true, false, 3, 'PROPOSE', now()),
  ('ENSTEST001', 7, NULL, 75, 'Formation PMP — Gestion de Projet', 'INTERNE', 0.70, 0.68, 0.82, 0.73, 0.70, 2, false, true, 3, 'PROPOSE', now()),
  ('ENSTEST001', 3, NULL, 90, 'formation-spring', 'EXTERNE', 0.65, 0.60, 0.78, 0.67, 0.66, 3, false, true, 2, 'PROPOSE', now());

-- ── 3. Parcours de formation (training paths + items) ────────────────────────
INSERT INTO "analyse"."training_paths"
  (enseignant_id, competence_id, competence_nom, niveau_depart, niveau_vise, nb_formations,
   duree_totale_heures, probabilite_reussite_globale, statut, created_at)
VALUES
  ('E00003', 4, 'Sécurité Applicative', 2, 4, 3, 48, 0.85, 'GENERE', now()),
  ('E00004', 2, 'Développement Frontend', 2, 4, 2, 32, 0.82, 'GENERE', now()),
  ('ENSTEST001', 6, 'Machine Learning', 1, 3, 3, 56, 0.71, 'GENERE', now());

INSERT INTO "analyse"."training_path_items"
  (training_path_id, formation_id, formation_titre, formation_type, duree_heures, rang,
   est_obligatoire, prerequis_competences, niveau_avant, niveau_apres, prerequis_satisfaits,
   deja_suivie, score_formation, justification)
VALUES
  ((SELECT id FROM "analyse"."training_paths" WHERE enseignant_id='E00003'), 2, 'Sécurité Web et OWASP Top 10', 'INTERNE', 16, 1, true, '[]'::jsonb, 2, 4, true, false, 0.89, 'Gap critique sécurité'),
  ((SELECT id FROM "analyse"."training_paths" WHERE enseignant_id='E00003'), 1, 'Atelier Spring Boot 3 & JPA Avancé', 'INTERNE', 16, 2, false, '[]'::jsonb, 3, 4, true, false, 0.84, 'Renforcer le back-end'),
  ((SELECT id FROM "analyse"."training_paths" WHERE enseignant_id='E00003'), 3, 'Introduction au Machine Learning avec Python', 'EXTERNE', 16, 3, false, '[]'::jsonb, 3, 4, false, false, 0.75, 'Monter en compétence IA'),
  ((SELECT id FROM "analyse"."training_paths" WHERE enseignant_id='E00004'), 24, 'formation react', 'INTERNE', 16, 1, true, '[]'::jsonb, 2, 4, true, false, 0.85, 'Gap front-end'),
  ((SELECT id FROM "analyse"."training_paths" WHERE enseignant_id='E00004'), 1, 'Atelier Spring Boot 3 & JPA Avancé', 'INTERNE', 16, 2, false, '[]'::jsonb, 3, 4, true, false, 0.78, 'Complément back-end'),
  ((SELECT id FROM "analyse"."training_paths" WHERE enseignant_id='ENSTEST001'), 3, 'Introduction au Machine Learning avec Python', 'EXTERNE', 24, 1, true, '[]'::jsonb, 1, 3, false, false, 0.72, 'Priorité métier'),
  ((SELECT id FROM "analyse"."training_paths" WHERE enseignant_id='ENSTEST001'), 75, 'Formation PMP — Gestion de Projet', 'INTERNE', 16, 2, false, '[]'::jsonb, 2, 3, true, false, 0.73, 'Pilotage de projet'),
  ((SELECT id FROM "analyse"."training_paths" WHERE enseignant_id='ENSTEST001'), 90, 'formation-spring', 'EXTERNE', 16, 3, false, '[]'::jsonb, 2, 3, true, false, 0.66, 'Approfondissement');

-- ── 4. Événements d'alerte (répartis sur 6 mois pour l'évolution du risque) ──
-- CORRIGÉ : departement_id correspond aux IDs du seed V5 (D1..D5).
-- formation_id référence les IDs du seed V5 (1..10, 24, 75, 90 n'existent pas → utilisés comme placeholders).
INSERT INTO "analyse"."alert_events"
  (type_alerte, cible_type, enseignant_id, departement_id, competence_id, skill_gap_id,
   severite, titre, message, details_json, statut, created_at)
VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'E00003', 'D2', 4, NULL, 'CRITICAL',
   'Gap critique — Sécurité Applicative', 'Niveau actuel 2 / requis 4 sur la compétence Sécurité Applicative.',
   '{"competence":"Sécurité Applicative","ecart":2}'::jsonb, 'NOUVELLE', now() - interval '6 days'),
  ('REGRESSION', 'ENSEIGNANT', 'E00003', 'D2', 6, NULL, 'CRITICAL',
   'Régression — Machine Learning', 'Le niveau en Machine Learning a baissé de 12 % sur 6 mois.',
   '{"competence":"Machine Learning","delta":-0.12}'::jsonb, 'NOUVELLE', now() - interval '3 days'),
  ('STAGNATION', 'ENSEIGNANT', 'E00003', 'D2', 2, NULL, 'WARNING',
   'Stagnation — Développement Backend', 'Aucune formation validée depuis 14 mois.',
   '{"mois_stagnation":14}'::jsonb, 'LUE', now() - interval '20 days'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'E00003', 'D2', 2, NULL, 'WARNING',
   'Gap modéré — Développement Frontend', 'Niveau actuel 2 / requis 3.',
   '{"competence":"Développement Frontend","ecart":1}'::jsonb, 'TRAITEE', now() - interval '40 days'),
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'E00004', 'D1', 2, NULL, 'WARNING',
   'Complétion faible — Frontend', 'Taux de complétion formation à 50 %.',
   '{"taux":0.5}'::jsonb, 'NOUVELLE', now() - interval '2 days'),
  ('STAGNATION', 'ENSEIGNANT', 'E00004', 'D1', 5, NULL, 'WARNING',
   'Stagnation — Infrastructure & Cloud', 'Stagnation de 8 mois détectée.',
   '{"mois_stagnation":8}'::jsonb, 'LUE', now() - interval '15 days'),
  ('TENDANCE_DEPARTEMENT', 'DEPARTEMENT', NULL, 'D1', NULL, NULL, 'CRITICAL',
   'Tendance département — D1', '3 enseignants avec gaps croissants en Sécurité.',
   '{"nb":3}'::jsonb, 'NOUVELLE', now() - interval '5 days'),
  ('BESOIN_NON_COUVERT', 'DEPARTEMENT', NULL, 'D2', 4, NULL, 'CRITICAL',
   'Besoin non couvert — Sécurité', '8 besoins exprimés non couverts en Sécurité Applicative.',
   '{"nb_besoins":8}'::jsonb, 'NOUVELLE', now() - interval '1 days'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'E00003', 'D2', 4, NULL, 'CRITICAL', 'Gap critique (févr.)', 'Historique.', '{}'::jsonb, 'TRAITEE', now() - interval '5 months'),
  ('STAGNATION', 'ENSEIGNANT', 'E00004', 'D1', 5, NULL, 'WARNING', 'Stagnation (févr.)', 'Historique.', '{}'::jsonb, 'TRAITEE', now() - interval '5 months'),
  ('REGRESSION', 'ENSEIGNANT', 'E00003', 'D2', 6, NULL, 'CRITICAL', 'Régression (mars)', 'Historique.', '{}'::jsonb, 'TRAITEE', now() - interval '4 months'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'E00003', 'D2', 4, NULL, 'CRITICAL', 'Gap critique (mars)', 'Historique.', '{}'::jsonb, 'TRAITEE', now() - interval '4 months'),
  ('STAGNATION', 'ENSEIGNANT', 'E00004', 'D1', 2, NULL, 'WARNING', 'Stagnation (avr.)', 'Historique.', '{}'::jsonb, 'TRAITEE', now() - interval '3 months'),
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'ENSTEST001', 'D1', 6, NULL, 'WARNING', 'Complétion (avr.)', 'Historique.', '{}'::jsonb, 'TRAITEE', now() - interval '3 months'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'E00003', 'D2', 4, NULL, 'CRITICAL', 'Gap critique (mai)', 'Historique.', '{}'::jsonb, 'TRAITEE', now() - interval '2 months'),
  ('REGRESSION', 'ENSEIGNANT', 'E00003', 'D2', 1, NULL, 'CRITICAL', 'Régression (mai)', 'Historique.', '{}'::jsonb, 'TRAITEE', now() - interval '2 months'),
  ('STAGNATION', 'ENSEIGNANT', 'E00004', 'D1', 5, NULL, 'WARNING', 'Stagnation (juin)', 'Historique.', '{}'::jsonb, 'TRAITEE', now() - interval '1 month'),
  ('TENDANCE_DEPARTEMENT', 'DEPARTEMENT', NULL, 'D1', NULL, NULL, 'CRITICAL', 'Tendance (juin)', 'Historique.', '{}'::jsonb, 'LUE', now() - interval '1 month');

-- ── 5. Journal de ré-entraînement du modèle ──────────────────────────────────
INSERT INTO "analyse"."model_retraining_log"
  (model_name, model_version, accuracy_before, accuracy_after, accuracy_metric, dataset_size,
   statut, raison, triggered_by, retrained_at)
VALUES
  ('gap_predictor_v1', 'v1.2.0', 0.79, 0.87, 'r2', 120, 'success',
   'Ré-entraînement hebdomadaire (données complètes)', 'scheduler', now() - interval '11 days');

-- ── 6. Historique de gaps (pour "Compétences en Déclin") ─────────────────────
-- CORRIGÉ : domaine_id et domaine_nom cohérents avec le seed V5 (domaines.id = 1..8).
-- domaine_id 1=INFO, 3=NET, 4=IA, 5=DATA, 6=ELEC, 8=TELC.
INSERT INTO "analyse"."skill_gaps"
  (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
   niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score,
   priorite_score, niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at)
VALUES
  ('E00003', 6, 'C6', 'Machine Learning', 4, 'Intelligence Artificielle', 5, 3, 4, 0.4, 0.6, 0.3, 0.4, 'FAIBLE', 12, false, 2, now() - interval '6 months'),
  ('E00003', 2, 'C2', 'Programmation Java', 1, 'Informatique', 3, 4, 4, 0.25, 0.30, 0.20, 0.30, 'FAIBLE', 8, false, 1, now() - interval '6 months'),
  ('E00004', 5, 'C5', 'Infrastructure & Cloud', 5, 'Data Science', 3, 4, 4, 0.30, 0.35, 0.25, 0.30, 'FAIBLE', 6, false, 1, now() - interval '6 months'),
  ('E00004', 2, 'C2', 'Programmation Java', 1, 'Informatique', 3, 4, 4, 0.25, 0.30, 0.20, 0.30, 'FAIBLE', 8, false, 1, now() - interval '6 months');

-- ── 7. Quelques gaps récents en urgence CRITIQUE (pour "Gaps critiques") ─────
UPDATE "analyse"."skill_gaps"
   SET niveau_urgence = 'CRITIQUE',
       urgence_score = 0.9,
       priorite_score = 0.9,
       gap_score = 0.85,
       en_regression = true,
       mois_stagnation = 14
 WHERE enseignant_id = 'E00003'
   AND competence_id = 4
   AND computed_at >= now() - interval '30 days';

-- Purge du cache de snapshot pour forcer le recalcul
DELETE FROM "analyse"."dashboard_snapshots";
