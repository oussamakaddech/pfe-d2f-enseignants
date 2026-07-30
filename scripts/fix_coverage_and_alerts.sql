-- Clean old alerts from V7 that reference non-existent teachers
DELETE FROM "analyse".alert_events WHERE enseignant_id IN ('E00003','E00004','ENSTEST001');

-- Clean old teacher_competence_coverage and replace with new data
DELETE FROM "analyse".teacher_competence_coverage;

-- Populate teacher_competence_coverage for all 27 teachers × 12 competences
INSERT INTO "analyse".teacher_competence_coverage
  (enseignant_id, competence_id, departement_id, current_level, required_level, covered, snapshot_date)
SELECT
  trp.enseignant_id,
  sg.competence_id,
  CASE
    WHEN trp.enseignant_id LIKE 'ENS001' OR trp.enseignant_id LIKE 'ENS002' OR trp.enseignant_id LIKE 'ENS003' OR trp.enseignant_id LIKE 'ENS004' OR trp.enseignant_id LIKE 'ENS005' THEN 'DEPT_GL'
    WHEN trp.enseignant_id LIKE 'ENS006' OR trp.enseignant_id LIKE 'ENS007' OR trp.enseignant_id LIKE 'ENS008' OR trp.enseignant_id LIKE 'ENS009' THEN 'DEPT_INFO'
    WHEN trp.enseignant_id LIKE 'ENS010' OR trp.enseignant_id LIKE 'ENS011' OR trp.enseignant_id LIKE 'ENS012' OR trp.enseignant_id LIKE 'ENS013' THEN 'DEPT_RT'
    WHEN trp.enseignant_id LIKE 'ENS014' OR trp.enseignant_id LIKE 'ENS015' OR trp.enseignant_id LIKE 'ENS016' OR trp.enseignant_id LIKE 'ENS017' THEN 'DEPT_GC'
    WHEN trp.enseignant_id LIKE 'ENS018' OR trp.enseignant_id LIKE 'ENS019' OR trp.enseignant_id LIKE 'ENS020' OR trp.enseignant_id LIKE 'ENS021' THEN 'DEPT_WEB'
    WHEN trp.enseignant_id LIKE 'ENS02%' THEN 'DEPT_IA'
    ELSE NULL
  END,
  sg.niveau_actuel,
  sg.niveau_requis,
  (sg.niveau_actuel >= sg.niveau_requis),
  CURRENT_DATE
FROM "analyse".skill_gaps sg
JOIN "analyse".teacher_risk_profiles trp ON trp.enseignant_id = sg.enseignant_id;

SELECT 'Updated' as status, COUNT(*) as coverage_rows FROM "analyse".teacher_competence_coverage;
