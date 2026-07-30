SELECT 'teacher_count', count(*) FROM "formation"."ups";
SELECT 'department_count', count(*) FROM "formation"."departments";
SELECT 'competence_count', count(*) FROM "competence"."competences";
SELECT teacher_id, count(*), avg(gap_value) FROM "analyse"."skill_gaps" GROUP BY teacher_id ORDER BY count(*) DESC;
SELECT formation_id, count(*) FROM "analyse"."recommendations" GROUP BY formation_id ORDER BY count(*) DESC;
SELECT count(DISTINCT teacher_id), count(*) FROM "analyse"."recommendations";