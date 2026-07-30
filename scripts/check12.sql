SELECT id FROM formation.ups ORDER BY id;
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'analyse.skill_gaps'::regclass;
