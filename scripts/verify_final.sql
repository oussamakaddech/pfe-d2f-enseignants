SELECT 'teachers' as tbl, COUNT(*) as cnt FROM formation.enseignants WHERE id LIKE 'ENS%' OR id = 'FORM001'
UNION ALL
SELECT 'risk_profiles', COUNT(*) FROM "analyse".teacher_risk_profiles
UNION ALL
SELECT 'skill_gaps', COUNT(*) FROM "analyse".skill_gaps
UNION ALL
SELECT 'alert_events', COUNT(*) FROM "analyse".alert_events
UNION ALL
SELECT 'dashboard_snapshots', COUNT(*) FROM "analyse".dashboard_snapshots;

-- Show risk profiles
SELECT trp.enseignant_id, e.nom, e.prenom, e.dept_id, trp.score_risque, trp.niveau_risque, trp.nb_gaps_critiques
FROM "analyse".teacher_risk_profiles trp
JOIN formation.enseignants e ON e.id = trp.enseignant_id
ORDER BY trp.score_risque DESC;
