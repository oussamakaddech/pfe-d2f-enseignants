-- Teachers with affectations (enseignant_competences)
SELECT enseignant_id, COUNT(*) as nb_savoirs 
FROM "competence".enseignant_competences 
GROUP BY enseignant_id 
ORDER BY enseignant_id;

-- Teachers with analytics (skill_gaps)
SELECT enseignant_id, COUNT(*) as nb_gaps 
FROM "analyse".skill_gaps 
GROUP BY enseignant_id 
ORDER BY enseignant_id;

-- Teachers in enseignants table
SELECT id, nom, prenom FROM "formation".enseignants ORDER BY id;
