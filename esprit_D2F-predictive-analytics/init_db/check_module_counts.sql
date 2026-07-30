-- Check how many teachers exist in each module
SELECT 'enseignants (formation)' as tbl, COUNT(*) FROM formation.enseignants;
SELECT 'enseignant_competences (competence)' as tbl, COUNT(*) FROM competence.enseignant_competences;
SELECT 'skill_gaps (analyse)' as tbl, COUNT(*) FROM analyse.skill_gaps;
SELECT 'teacher_risk_profiles (analyse)' as tbl, COUNT(*) FROM analyse.teacher_risk_profiles;
