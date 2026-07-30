-- Generate COMPLETION_FAIBLE alerts for teachers with no recent inscriptions
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, severite, titre, message, statut, created_at)
SELECT DISTINCT ON (e.id)
  'COMPLETION_FAIBLE',
  'INDIVIDUEL',
  e.id,
  'WARNING',
  'Complétion faible — ' || e.nom || ' ' || e.prenom,
  'Enseignant ' || e.id || ' (' || e.nom || ' ' || e.prenom || '): aucune formation suivie depuis plus de 30 jours.',
  'NOUVELLE',
  NOW() - (random() * interval '3 days')
FROM "formation".enseignants e
WHERE e.id LIKE 'ENS%'
  AND e.deleted_at IS NULL
  AND (
    NOT EXISTS (SELECT 1 FROM "formation".inscriptions i WHERE i.enseignant_id = e.id)
    OR (SELECT MAX(i.date_demande) FROM "formation".inscriptions i WHERE i.enseignant_id = e.id) < NOW() - INTERVAL '30 days'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "analyse".alert_events a 
    WHERE a.enseignant_id = e.id 
      AND a.type_alerte = 'COMPLETION_FAIBLE'
      AND a.created_at > NOW() - INTERVAL '7 days'
  )
ON CONFLICT DO NOTHING;

-- Verify
SELECT type_alerte, severite, COUNT(*) FROM "analyse".alert_events GROUP BY type_alerte, severite ORDER BY type_alerte, severite;
SELECT 'total' as tbl, COUNT(*) FROM "analyse".alert_events;
