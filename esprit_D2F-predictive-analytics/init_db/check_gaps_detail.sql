SELECT niveau_urgence, COUNT(*) FROM "analyse".skill_gaps WHERE enseignant_id = 'ENS014' GROUP BY niveau_urgence;
SELECT mois_stagnation, COUNT(*) FROM "analyse".skill_gaps WHERE enseignant_id = 'ENS014' GROUP BY mois_stagnation;
SELECT en_regression, COUNT(*) FROM "analyse".skill_gaps WHERE enseignant_id = 'ENS014' GROUP BY en_regression;
