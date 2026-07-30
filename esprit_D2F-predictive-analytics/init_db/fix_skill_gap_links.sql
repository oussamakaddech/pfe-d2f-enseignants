-- Link recommendations to skill_gaps so competence_nom and niveau_actuel are populated
UPDATE "analyse".recommendations r
SET skill_gap_id = g.id
FROM "analyse".skill_gaps g
WHERE r.enseignant_id = g.enseignant_id
  AND r.competence_id = g.competence_id
  AND r.skill_gap_id IS NULL;

-- Verify competence_nom is now populated
SELECT r.id, r.competence_id, sg.competence_nom, sg.niveau_actuel 
FROM "analyse".recommendations r
JOIN "analyse".skill_gaps sg ON r.skill_gap_id = sg.id
WHERE r.enseignant_id = 'ENS014'
ORDER BY r.score_global DESC;
