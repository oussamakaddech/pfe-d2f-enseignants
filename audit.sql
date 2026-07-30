-- Delete old ML training recommendations (score 0.7900)
DELETE FROM "analyse"."recommendations" WHERE score_global = 0.7900;

-- Check remaining recommendations
SELECT enseignant_id, count(*) as n_recos, avg(score_global) as avg_score
FROM "analyse"."recommendations"
GROUP BY enseignant_id
ORDER BY enseignant_id;