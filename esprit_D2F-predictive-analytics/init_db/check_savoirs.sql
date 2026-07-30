SELECT COUNT(*) as total_savoirs FROM "competence".savoirs;
SELECT COUNT(*) as total_competences FROM "competence".competences;
SELECT s.id, s.code, s.nom FROM "competence".savoirs s ORDER BY s.id LIMIT 20;
