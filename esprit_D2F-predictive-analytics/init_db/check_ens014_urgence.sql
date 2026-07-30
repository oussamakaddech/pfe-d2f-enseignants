SELECT DISTINCT niveau_urgence, COUNT(*) FROM "analyse".skill_gaps WHERE enseignant_id = 'ENS014' GROUP BY niveau_urgence;
