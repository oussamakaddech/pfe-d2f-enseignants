-- Compute correct factors for ENS014
SELECT 
  COUNT(*) as total_gaps,
  SUM(CASE WHEN niveau_urgence = 'CRITIQUE' THEN 1 ELSE 0 END) as nb_critique,
  MAX(mois_stagnation) as max_stag,
  MAX(CASE WHEN en_regression THEN 1 ELSE 0 END) as has_regression
FROM "analyse".skill_gaps
WHERE enseignant_id = 'ENS014';

-- Check settings for stagnation window
-- risk_stagnation_window_months default = 12 typically
