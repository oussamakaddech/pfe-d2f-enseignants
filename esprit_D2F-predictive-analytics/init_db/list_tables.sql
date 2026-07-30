SELECT table_name FROM information_schema.tables WHERE table_schema = 'analyse' AND table_name LIKE '%risk%';
SELECT table_name FROM information_schema.tables WHERE table_schema = 'analyse' AND table_name LIKE '%history%';
SELECT table_name FROM information_schema.tables WHERE table_schema = 'analyse' ORDER BY table_name;
