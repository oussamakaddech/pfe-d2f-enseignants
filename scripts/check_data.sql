SELECT COUNT(*) as teacher_risk_profiles FROM "analyse".teacher_risk_profiles;
SELECT COUNT(*) as skill_gaps FROM "analyse".skill_gaps;
SELECT COUNT(*) as alert_events FROM "analyse".alert_events;
SELECT COUNT(*) as teacher_competence_coverage FROM "analyse".teacher_competence_coverage;
SELECT COUNT(*) as prediction_results FROM "analyse".prediction_results;
SELECT t.first_name, t.last_name, trp.risk_score, trp.risk_level 
FROM "analyse".teacher_risk_profiles trp
JOIN "analyse".teachers t ON t.id = trp.teacher_id
ORDER BY trp.risk_score DESC;
