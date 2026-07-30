-- Check severite values for each type
SELECT type_alerte, severite, COUNT(*) 
FROM "analyse".alert_events 
GROUP BY type_alerte, severite 
ORDER BY type_alerte, severite;

-- Check besoins non couverts
SELECT type_alerte, enseignant_id, titre, statut, created_at 
FROM "analyse".alert_events 
WHERE type_alerte = 'BESOIN_NON_COUVERT' 
ORDER BY created_at DESC LIMIT 5;

-- Check completion faible
SELECT type_alerte, enseignant_id, titre, statut, created_at 
FROM "analyse".alert_events 
WHERE type_alerte = 'COMPLETION_FAIBLE' 
ORDER BY created_at DESC LIMIT 5;
