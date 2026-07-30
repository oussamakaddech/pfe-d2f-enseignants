-- Seed data for ENS012 teacher page: recommendations, alerts, risk history

-- 1. Recommendations
INSERT INTO "analyse".recommendations 
(enseignant_id, competence_id, formation_id, formation_titre, formation_type, score_pertinence, score_taux_reussite, score_disponibilite, score_global, probabilite_reussite, rang_dans_parcours, est_prerequis, prerequis_satisfaits, niveau_apres, justification, statut, created_at)
VALUES
('ENS012', 6, 101, 'Machine Learning Fondamentaux', 'FORMATION', 0.85, 0.78, 0.90, 0.82, 0.80, 1, false, false, 3, 'Ecart critique (score 1.0) en ML. Formation prioritaire.', 'ACTIVE', NOW() - INTERVAL '5 days'),
('ENS012', 8, 102, 'Ingénierie Pédagogique Avancée', 'FORMATION', 0.80, 0.72, 0.85, 0.79, 0.76, 2, false, false, 3, 'Gap HAUTE en Conception Pédagogique. Niveau requis 5 vs actuel 0.', 'ACTIVE', NOW() - INTERVAL '5 days'),
('ENS012', 9, 103, 'Cloud & Infrastructure AWS', 'FORMATION', 0.70, 0.65, 0.80, 0.72, 0.68, 3, false, false, 5, 'Ecart en Infrastructure et Cloud. Score 0.67.', 'ACTIVE', NOW() - INTERVAL '4 days'),
('ENS012', 12, 104, 'DevOps & Intégration Continue', 'FORMATION', 0.65, 0.70, 0.75, 0.70, 0.65, 4, false, false, 5, 'Gap CRITIQUE en DevOps. Score 0.75.', 'ACTIVE', NOW() - INTERVAL '4 days'),
('ENS012', 1, 105, 'Développement Backend Java/Spring', 'MENTORING', 0.60, 0.68, 0.70, 0.66, 0.62, 5, false, false, 3, 'Ecart en Backend. Mentoring recommandé.', 'ACTIVE', NOW() - INTERVAL '3 days'),
('ENS012', 3, 106, 'Qualité Logicielle & Tests', 'RESSOURCE', 0.50, 0.55, 0.90, 0.65, 0.58, 6, false, false, 3, 'Ressources disponibles pour couvrir les bases.', 'ACTIVE', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- 2. Alert events
INSERT INTO "analyse".alert_events 
(type_alerte, cible_type, enseignant_id, competence_id, severite, titre, message, statut, created_at)
VALUES
('BESOIN_NON_COUVERT', 'INDIVIDUEL', 'ENS012', 12, 'CRITIQUE', 'Compétence DevOps non couverte', 'Ecart critique DevOps (score 0.75) sans formation planifiée. Action urgente requise.', 'NOUVELLE', NOW() - INTERVAL '7 days'),
('GAP_CRITIQUE', 'INDIVIDUEL', 'ENS012', 6, 'HAUTE', 'Écart élevé Machine Learning', 'Score 1.0 en ML — niveau actuel 0 vs requis 5. Formation prioritaire recommandée.', 'EN_COURS', NOW() - INTERVAL '5 days'),
('STAGNATION', 'INDIVIDUEL', 'ENS012', NULL, 'MOYENNE', 'Score de risque stable', 'Le score de risque est stable à 0.3 depuis plusieurs mois. Pas de progression détectée.', 'NOUVELLE', NOW() - INTERVAL '3 days'),
('BESOIN_NON_COUVERT', 'INDIVIDUEL', 'ENS012', 8, 'HAUTE', 'Conception Pédagogique non acquise', 'Ecart de niveau en Conception Pédagogique. Niveau actuel 0 vs requis 5.', 'NOUVELLE', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- 3. Risk history snapshots over several months
INSERT INTO "analyse".teacher_risk_snapshots 
(enseignant_id, snapshot_date, score_risque, niveau_risque, tendance, computed_at)
VALUES
('ENS012', (CURRENT_DATE - INTERVAL '6 months')::date, 0.2000, 'FAIBLE', 'PROGRESSION', NOW() - INTERVAL '6 months'),
('ENS012', (CURRENT_DATE - INTERVAL '5 months')::date, 0.2500, 'MODERE', 'STABLE', NOW() - INTERVAL '5 months'),
('ENS012', (CURRENT_DATE - INTERVAL '4 months')::date, 0.3500, 'MODERE', 'REGRESSION', NOW() - INTERVAL '4 months'),
('ENS012', (CURRENT_DATE - INTERVAL '3 months')::date, 0.3000, 'MODERE', 'STABLE', NOW() - INTERVAL '3 months'),
('ENS012', (CURRENT_DATE - INTERVAL '2 months')::date, 0.3200, 'MODERE', 'STABLE', NOW() - INTERVAL '2 months'),
('ENS012', (CURRENT_DATE - INTERVAL '1 month')::date, 0.3100, 'MODERE', 'STABLE', NOW() - INTERVAL '1 month'),
('ENS012', CURRENT_DATE, 0.3000, 'MODERE', 'STABLE', NOW())
ON CONFLICT DO NOTHING;

SELECT 'SEED DONE' as status;
