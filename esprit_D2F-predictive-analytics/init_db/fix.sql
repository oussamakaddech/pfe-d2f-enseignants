-- Fix 1: Corriger en_regression sur les gaps
-- Tous les gaps inseres par V8 ont en_regression = FALSE
-- mais certaines donnees residuelles ou mises a jour les ont mis a TRUE
-- On remet a FALSE sauf si mois_stagnation > 6 OU si le gap a ete explicitement marque
UPDATE "analyse".skill_gaps 
SET en_regression = FALSE 
WHERE en_regression = TRUE 
  AND mois_stagnation < 6;

-- Fix 2: Corriger les tendances des teacher_risk_profiles
-- Basé sur score_risque vs precedent_score_risque
UPDATE "analyse".teacher_risk_profiles SET tendance = 'PROGRESSION'
WHERE score_risque < precedent_score_risque;
UPDATE "analyse".teacher_risk_profiles SET tendance = 'STABLE'
WHERE score_risque = precedent_score_risque;
UPDATE "analyse".teacher_risk_profiles SET tendance = 'REGRESSION'
WHERE score_risque > precedent_score_risque;

-- Fix 3: Corriger nb_regression (re-count)
SELECT COUNT(DISTINCT enseignant_id) as nb_regression_final 
FROM "analyse".skill_gaps 
WHERE en_regression = TRUE;

-- Fix 4: Corriger nb_stagnation (re-count)
SELECT COUNT(DISTINCT enseignant_id) as nb_stagnation_final 
FROM "analyse".skill_gaps 
WHERE mois_stagnation >= 3;

-- Fix 5: Mettre a jour les tendances dans le resume
SELECT enseignant_id, score_risque, precedent_score_risque, tendance
FROM "analyse".teacher_risk_profiles 
WHERE enseignant_id LIKE 'ENS%'
ORDER BY enseignant_id;
