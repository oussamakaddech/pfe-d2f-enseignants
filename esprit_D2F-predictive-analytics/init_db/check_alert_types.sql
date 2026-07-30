-- Check what alert types exist
SELECT type_alerte, COUNT(*) FROM "analyse".alert_events GROUP BY type_alerte;

-- Check if there's a besoins table
SELECT table_schema, table_name FROM information_schema.tables WHERE table_name LIKE '%besoin%' ORDER BY table_schema;

-- Check inscriptions for training completion
SELECT table_schema, table_name FROM information_schema.tables WHERE table_name IN ('inscriptions', 'presences', 'formations') ORDER BY table_schema;
