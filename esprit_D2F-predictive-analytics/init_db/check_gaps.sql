-- Teachers with gaps but no recommendations
SELECT g.enseignant_id, COUNT(DISTINCT g.competence_id) as gap_count
FROM "analyse".skill_gaps g
WHERE g.enseignant_id LIKE 'ENS%'
  AND g.gap_score >= 0.3
  AND NOT EXISTS (SELECT 1 FROM "analyse".recommendations r WHERE r.enseignant_id = g.enseignant_id)
GROUP BY g.enseignant_id
ORDER BY gap_count DESC;

-- Teachers with no alerts at all
SELECT DISTINCT g.enseignant_id
FROM "analyse".skill_gaps g
WHERE g.enseignant_id LIKE 'ENS%'
  AND NOT EXISTS (SELECT 1 FROM "analyse".alert_events a WHERE a.enseignant_id = g.enseignant_id)
ORDER BY g.enseignant_id;

-- Teachers with no risk snapshots
SELECT DISTINCT e.enseignant_id
FROM "analyse".teacher_risk_profiles e
WHERE e.enseignant_id LIKE 'ENS%'
  AND NOT EXISTS (SELECT 1 FROM "analyse".teacher_risk_snapshots s WHERE s.enseignant_id = e.enseignant_id)
ORDER BY e.enseignant_id;
