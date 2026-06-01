-- =============================================================================
-- V3__seed_test_data.sql — Données de test/développement pour les tables analytics
-- Usage : injecter dans la base de dev locale pour valider le pipeline complet.
--         NE PAS exécuter en production.
-- =============================================================================

-- ── feature_snapshots ─────────────────────────────────────────────────────────
INSERT INTO feature_snapshots (
    enseignant_id, snapshot_date,
    nb_competences_total, nb_competences_acquises,
    niveau_moyen_competences, nb_gaps_critiques, nb_gaps_totaux,
    nb_formations_completees, nb_formations_en_cours,
    taux_completion_formations, taux_presence_moyen,
    nb_besoins_exprimes, nb_besoins_approuves, nb_certificats,
    score_engagement
)
VALUES
    ('ENS001', CURRENT_DATE,
     8, 5, 3.2, 1, 3, 6, 1, 0.85, 0.90, 2, 1, 3, 0.75),
    ('ENS002', CURRENT_DATE,
     6, 2, 1.8, 2, 4, 2, 0, 0.40, 0.55, 4, 2, 1, 0.30),
    ('ENS003', CURRENT_DATE,
     10, 9, 4.5, 0, 1, 12, 0, 0.95, 0.98, 1, 1, 7, 0.92)
ON CONFLICT (enseignant_id, snapshot_date) DO NOTHING;

-- ── skill_gaps ────────────────────────────────────────────────────────────────
INSERT INTO skill_gaps (
    enseignant_id, competence_id, competence_code, competence_nom,
    domaine_nom, niveau_actuel, niveau_requis, niveau_vise,
    gap_score, urgence_score, impact_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression,
    nb_besoins_exprimes, justification
)
VALUES
    -- ENS001 : gap haute sur IA
    ('ENS001', 10, 'C10', 'Intelligence Artificielle',
     'Informatique', 2, 4, 4,
     0.40, 0.42, 0.38, 0.60,
     'HAUTE', 8, FALSE,
     2, 'Écart de niveau : 2.0/5 points — stagnation depuis 8 mois — 2 besoin(s) exprimé(s).'),

    -- ENS001 : gap critique sur Big Data
    ('ENS001', 11, 'C11', 'Big Data',
     'Informatique', 1, 5, 5,
     0.80, 0.70, 0.60, 0.76,
     'CRITIQUE', 14, TRUE,
     3, 'Écart de niveau : 4.0/5 points — régression détectée — stagnation depuis 14 mois.'),

    -- ENS002 : gap critique sur DevOps
    ('ENS002', 20, 'C20', 'DevOps',
     'Génie Logiciel', 1, 4, 4,
     0.60, 0.80, 0.70, 0.77,
     'CRITIQUE', 18, TRUE,
     4, 'Écart de niveau : 3.0/5 points — régression détectée — stagnation depuis 18 mois.'),

    -- ENS002 : gap modéré sur Sécurité
    ('ENS002', 21, 'C21', 'Cybersécurité',
     'Réseaux', 3, 4, 4,
     0.20, 0.20, 0.15, 0.28,
     'MODEREE', 3, FALSE,
     1, 'Écart de niveau : 1.0/5 points — 1 besoin(s) exprimé(s).'),

    -- ENS003 : gap faible (profil quasi-expert)
    ('ENS003', 5, 'C05', 'Systèmes Embarqués',
     'Électronique', 4, 5, 5,
     0.20, 0.05, 0.10, 0.12,
     'FAIBLE', 2, FALSE,
     0, 'Écart de niveau : 1.0/5 points.')
ON CONFLICT DO NOTHING;

-- ── recommendations ───────────────────────────────────────────────────────────
INSERT INTO recommendations (
    enseignant_id, formation_id, formation_titre, formation_type,
    competence_id, score_pertinence, score_reussite, score_disponibilite,
    score_global, probabilite_reussite, rang_dans_parcours, justification, statut
)
VALUES
    ('ENS001', 101, 'Machine Learning avec Python', 'EN_LIGNE',
     10, 0.85, 0.80, 1.0, 0.83, 0.78, 1,
     'Formation alignée sur le gap IA — niveau cible N4.', 'PROPOSEE'),

    ('ENS001', 102, 'Deep Learning Fondamentaux', 'EXTERNE',
     10, 0.70, 0.72, 0.90, 0.75, 0.68, 2,
     'Complément pour atteindre N4 après la formation ML.', 'PROPOSEE'),

    ('ENS001', 103, 'Big Data Engineering', 'INTERNE',
     11, 0.90, 0.65, 1.0, 0.81, 0.60, 1,
     'Formation urgente — gap critique Big Data détecté.', 'PROPOSEE'),

    ('ENS002', 104, 'CI/CD et Infrastructure as Code', 'EN_LIGNE',
     20, 0.88, 0.75, 1.0, 0.84, 0.70, 1,
     'Pipeline DevOps — répond au gap critique détecté.', 'PROPOSEE')
ON CONFLICT DO NOTHING;

-- ── training_paths ────────────────────────────────────────────────────────────
INSERT INTO training_paths (
    enseignant_id, competence_id, competence_nom,
    niveau_depart, niveau_vise, nb_formations,
    duree_totale_heures, probabilite_reussite_globale, statut
)
VALUES
    ('ENS001', 10, 'Intelligence Artificielle', 2, 4, 2, 48, 0.71, 'ACTIF'),
    ('ENS001', 11, 'Big Data', 1, 5, 3, 80, 0.55, 'ACTIF'),
    ('ENS002', 20, 'DevOps', 1, 4, 2, 40, 0.65, 'ACTIF')
ON CONFLICT DO NOTHING;

-- ── training_path_items ───────────────────────────────────────────────────────
-- Récupérer les IDs des parcours insérés ci-dessus (via sous-requêtes)
INSERT INTO training_path_items (
    training_path_id, rang, formation_id, formation_titre, formation_type,
    duree_heures, niveau_avant, niveau_apres,
    est_obligatoire, prerequis_satisfaits, deja_suivie, score_formation
)
SELECT
    tp.id, 1, 101, 'Machine Learning avec Python', 'EN_LIGNE',
    24, 2, 3, TRUE, TRUE, FALSE, 0.83
FROM training_paths tp
WHERE tp.enseignant_id = 'ENS001' AND tp.competence_id = 10 AND tp.statut = 'ACTIF'
ON CONFLICT DO NOTHING;

INSERT INTO training_path_items (
    training_path_id, rang, formation_id, formation_titre, formation_type,
    duree_heures, niveau_avant, niveau_apres,
    est_obligatoire, prerequis_satisfaits, deja_suivie, score_formation
)
SELECT
    tp.id, 2, 102, 'Deep Learning Fondamentaux', 'EXTERNE',
    24, 3, 4, TRUE, FALSE, FALSE, 0.75
FROM training_paths tp
WHERE tp.enseignant_id = 'ENS001' AND tp.competence_id = 10 AND tp.statut = 'ACTIF'
ON CONFLICT DO NOTHING;

-- ── teacher_risk_profiles ─────────────────────────────────────────────────────
INSERT INTO teacher_risk_profiles (
    enseignant_id, score_risque, niveau_risque, tendance,
    nb_gaps_critiques, nb_gaps_totaux,
    taux_completion_formations, facteurs_risque
)
VALUES
    ('ENS001', 0.42, 'MODERE',  'STABLE',      1, 3, 0.85, '["stagnation_8_mois"]'),
    ('ENS002', 0.78, 'CRITIQUE', 'REGRESSION',  2, 4, 0.40,
        '["regression_competence","faible_completion","stagnation_18_mois"]'),
    ('ENS003', 0.08, 'FAIBLE',  'PROGRESSION',  0, 1, 0.95, '[]')
ON CONFLICT (enseignant_id) DO UPDATE
    SET score_risque = EXCLUDED.score_risque,
        niveau_risque = EXCLUDED.niveau_risque,
        tendance = EXCLUDED.tendance,
        nb_gaps_critiques = EXCLUDED.nb_gaps_critiques,
        updated_at = NOW();

-- ── alert_events ──────────────────────────────────────────────────────────────
INSERT INTO alert_events (
    type_alerte, cible_type, enseignant_id,
    competence_id, severite, titre, message, statut
)
VALUES
    ('GAP_CRITIQUE',   'INDIVIDUEL', 'ENS001', 11,
     'CRITICAL',
     'Gap critique — Big Data',
     'Niveau actuel 1/5, requis 5/5. Régression détectée depuis 14 mois.',
     'NOUVELLE'),

    ('STAGNATION',     'INDIVIDUEL', 'ENS001', 10,
     'WARNING',
     'Stagnation IA — 8 mois sans progression',
     'Aucune progression sur la compétence Intelligence Artificielle depuis 8 mois.',
     'NOUVELLE'),

    ('GAP_CRITIQUE',   'INDIVIDUEL', 'ENS002', 20,
     'CRITICAL',
     'Gap critique — DevOps',
     'Niveau actuel 1/5, requis 4/5. Régression détectée.',
     'NOUVELLE'),

    ('REGRESSION',     'INDIVIDUEL', 'ENS002', 20,
     'WARNING',
     'Régression détectée — DevOps',
     'Le niveau de maîtrise de DevOps a régressé depuis la dernière évaluation.',
     'LUE'),

    ('COMPLETION_FAIBLE', 'INDIVIDUEL', 'ENS002', NULL,
     'WARNING',
     'Taux de complétion faible — ENS002',
     'Taux de complétion des formations : 40% (seuil : 40%).',
     'NOUVELLE')
ON CONFLICT DO NOTHING;

-- ── dashboard_snapshots ───────────────────────────────────────────────────────
INSERT INTO dashboard_snapshots (
    snapshot_date, nb_enseignants_analyses, nb_gaps_total, nb_gaps_critiques,
    nb_alertes_nouvelles, taux_couverture_moyen, payload
)
VALUES
    (CURRENT_DATE, 3, 5, 3, 4, 0.73,
     '{
       "competences_en_declin": [{"competence_id": 11, "competence_nom": "Big Data", "delta": -0.5}],
       "competences_en_demande": [{"competence_id": 10, "competence_nom": "IA", "score_demande": 0.82}],
       "top_formations": [{"formation_id": 103, "titre": "Big Data Engineering", "nb_reco": 3}]
     }'::jsonb
    )
ON CONFLICT (snapshot_date) DO NOTHING;
