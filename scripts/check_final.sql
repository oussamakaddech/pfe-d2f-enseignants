SELECT COUNT(DISTINCT enseignant_id) as monitored_teachers FROM "analyse".teacher_competence_coverage;
SELECT COUNT(DISTINCT enseignant_id) as teachers_with_gaps FROM "analyse".skill_gaps;
SELECT COUNT(DISTINCT enseignant_id) as teachers_with_profiles FROM "analyse".teacher_risk_profiles;
