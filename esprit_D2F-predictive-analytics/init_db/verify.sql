SELECT COUNT(DISTINCT enseignant_id) as nb_regression FROM "analyse".skill_gaps WHERE en_regression = TRUE;
SELECT COUNT(DISTINCT enseignant_id) as nb_stagnation FROM "analyse".skill_gaps WHERE mois_stagnation >= 3;
SELECT tendance, COUNT(*) as nb FROM "analyse".teacher_risk_profiles GROUP BY tendance;
