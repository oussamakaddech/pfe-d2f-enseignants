-- Update risk profiles to have at least 2 teachers with score >= 0.50
-- Also ensure some are MODERE/FAIBLE for distribution

-- Top teachers (at risk)
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.78, niveau_risque = 'CRITIQUE', nb_gaps_critiques = 7, nb_mois_stagnation_max = 8, tendance = 'REGRESSION' WHERE enseignant_id = 'ENS023';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.65, niveau_risque = 'ELEVE',   nb_gaps_critiques = 5, nb_mois_stagnation_max = 6, tendance = 'STAGNATION' WHERE enseignant_id = 'ENS011';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.58, niveau_risque = 'ELEVE',   nb_gaps_critiques = 4, nb_mois_stagnation_max = 5, tendance = 'STABLE'    WHERE enseignant_id = 'ENS012';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.52, niveau_risque = 'ELEVE',   nb_gaps_critiques = 4, nb_mois_stagnation_max = 4, tendance = 'STABLE'    WHERE enseignant_id = 'ENS010';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.48, niveau_risque = 'MODERE',  nb_gaps_critiques = 3, nb_mois_stagnation_max = 3, tendance = 'STABLE'    WHERE enseignant_id = 'ENS022';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.45, niveau_risque = 'MODERE',  nb_gaps_critiques = 2, nb_mois_stagnation_max = 2, tendance = 'STABLE'    WHERE enseignant_id = 'ENS003';

-- All others kept as-is (pipeline will recalculate, but we set reasonable values)
-- Ensure all 28 profiles have proper niveau_risque based on score
UPDATE "analyse".teacher_risk_profiles SET niveau_risque = 'FAIBLE' WHERE score_risque < 0.25;
UPDATE "analyse".teacher_risk_profiles SET niveau_risque = 'MODERE' WHERE score_risque >= 0.25 AND score_risque < 0.50;
UPDATE "analyse".teacher_risk_profiles SET niveau_risque = 'ELEVE' WHERE score_risque >= 0.50 AND score_risque < 0.75;
UPDATE "analyse".teacher_risk_profiles SET niveau_risque = 'CRITIQUE' WHERE score_risque >= 0.75;

SELECT niveau_risque, COUNT(*) FROM "analyse".teacher_risk_profiles GROUP BY niveau_risque ORDER BY niveau_risque;
