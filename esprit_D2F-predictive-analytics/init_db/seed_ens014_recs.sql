-- Direct insert recommendations for ENS014
INSERT INTO "analyse".recommendations 
(enseignant_id, competence_id, formation_id, formation_titre, formation_type, score_pertinence, score_taux_reussite, score_disponibilite, score_global, probabilite_reussite, rang_dans_parcours, est_prerequis, prerequis_satisfaits, niveau_apres, justification, statut, created_at)
VALUES
('ENS014', 1, 201, 'Formation Backend Java/Spring Boot', 'FORMATION', 0.85, 0.78, 0.90, 0.82, 0.80, 1, false, false, 3, 'Gap HAUTE en Développement Backend', 'ACTIVE', NOW() - INTERVAL '5 days'),
('ENS014', 2, 202, 'Formation React & Frontend Moderne', 'FORMATION', 0.80, 0.72, 0.85, 0.79, 0.76, 2, false, false, 3, 'Gap HAUTE en Développement Frontend', 'ACTIVE', NOW() - INTERVAL '5 days'),
('ENS014', 3, 203, 'Qualité Logicielle & Tests Unitaires', 'FORMATION', 0.70, 0.65, 0.80, 0.72, 0.68, 3, false, false, 3, 'Gap HAUTE en Qualité & Tests', 'ACTIVE', NOW() - INTERVAL '4 days'),
('ENS014', 4, 204, 'Sécurité Applicative OWASP', 'FORMATION', 0.65, 0.70, 0.75, 0.70, 0.65, 4, false, false, 3, 'Gap HAUTE en Sécurité Applicative', 'ACTIVE', NOW() - INTERVAL '4 days'),
('ENS014', 6, 205, 'Machine Learning Fondamentaux', 'FORMATION', 0.75, 0.68, 0.82, 0.75, 0.72, 5, false, false, 3, 'Gap HAUTE en Machine Learning', 'ACTIVE', NOW() - INTERVAL '3 days'),
('ENS014', 8, 206, 'Ingénierie Pédagogique Avancée', 'FORMATION', 0.78, 0.74, 0.88, 0.80, 0.77, 6, false, false, 3, 'Gap HAUTE en Conception Pédagogique', 'ACTIVE', NOW() - INTERVAL '3 days'),
('ENS014', 9, 207, 'Administration Cloud AWS/Azure', 'FORMATION', 0.68, 0.62, 0.78, 0.69, 0.64, 7, false, false, 5, 'Gap HAUTE en Infrastructure Cloud', 'ACTIVE', NOW() - INTERVAL '2 days'),
('ENS014', 12, 208, 'DevOps & Intégration Continue', 'FORMATION', 0.72, 0.70, 0.80, 0.74, 0.71, 8, false, false, 5, 'Gap HAUTE en DevOps', 'ACTIVE', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

SELECT 'recommendations_ens014' as tbl, COUNT(*) FROM "analyse".recommendations WHERE enseignant_id = 'ENS014';
