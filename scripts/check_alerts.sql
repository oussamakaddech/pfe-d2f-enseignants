-- Show all current alerts with dates
SELECT enseignant_id, type_alerte, severite, statut, created_at::date, titre
FROM "analyse".alert_events
ORDER BY created_at DESC
LIMIT 50;
