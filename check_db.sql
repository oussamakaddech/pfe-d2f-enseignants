SET search_path TO "formation", "analyse", "competence";

-- Teacher diversity
SELECT 'teacher_count' as metric, count(*) as value FROM formation.ups;
SELECT 'department_count' as metric, count(*) as value FROM formation.departments;

-- Competency distribution
SELECT 'competence_count' as metric, count(*) as value FROM competence.competences;

-- Gap distribution per teacher
SELECT teacher_id, count(*) as n_gaps, avg(gap_value) as avg_gap, sum(is_critical_gap::int) as n_critical
FROM analyse.skill_gaps
GROUP BY teacher_id
ORDER BY n_gaps DESC;

-- Recommendation distribution
SELECT formation_id, count(*) as n_recos
FROM analyse.recommendations
GROUP BY formation_id
ORDER BY n_recos DESC;

-- Top-1 recommendation concentration
SELECT formation_id, count(*) * 100.0 / (SELECT count(*) FROM analyse.recommendations) as pct
FROM (
    SELECT teacher_id, formation_id, row_number() OVER (PARTITION BY teacher_id ORDER BY score_global DESC) as rn
    FROM analyse.recommendations
) t
WHERE rn = 1
GROUP BY formation_id
ORDER BY pct DESC;

-- Top-3 duplicate percentage
WITH top3 AS (
    SELECT teacher_id, array_agg(formation_id ORDER BY score_global DESC limit 3) as recos
    FROM analyse.recommendations
    GROUP BY teacher_id
)
SELECT count(*) as n_teachers,
       count(DISTINCT recos) as n_unique_lists,
       count(*) - count(DISTINCT recos) as n_duplicates,
       (count(*) - count(DISTINCT recos)) * 100.0 / count(*) as duplicate_pct
FROM top3;

-- Profile uniqueness
SELECT count(*) as n_unique_profiles
FROM (
    SELECT teacher_id, array_agg(competence_id order by competence_id, niveau_actuel) as profile
    FROM analyse.skill_gaps
    GROUP BY teacher_id
) t;

-- Cache key verification (check if recommendations are teacher-specific)
SELECT teacher_id, count(*) as n_recommendations
FROM analyse.recommendations
GROUP BY teacher_id
HAVING count(*) > 0
ORDER BY n_recommendations DESC
limit 10;