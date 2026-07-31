SELECT ec.enseignant_id, ec.savoir_id, s.nom as savoir_nom, ec.niveau
FROM "competence".enseignant_competences ec
JOIN "competence".savoirs s ON s.id = ec.savoir_id
WHERE ec.enseignant_id IN ('ENS007', 'ENS015')
ORDER BY ec.enseignant_id, ec.savoir_id;