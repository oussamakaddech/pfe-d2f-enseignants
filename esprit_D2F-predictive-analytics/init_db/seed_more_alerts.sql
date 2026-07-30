-- Generate BESOIN_NON_COUVERT alerts for teachers who have unmet needs
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, competence_id, severite, titre, message, statut, created_at)
SELECT DISTINCT ON (g.enseignant_id, g.competence_id)
  'BESOIN_NON_COUVERT',
  'INDIVIDUEL',
  g.enseignant_id,
  g.competence_id,
  CASE WHEN g.gap_score >= 0.9 THEN 'CRITIQUE' WHEN g.gap_score >= 0.7 THEN 'HAUTE' ELSE 'MOYENNE' END,
  g.competence_nom || ' — besoin non couvert',
  'Enseignant ' || g.enseignant_id || ': écart de ' || ROUND(g.gap_score * 100) || '% en ' || g.competence_nom || '. Formation non disponible.',
  'NOUVELLE',
  NOW() - (random() * interval '7 days')
FROM "analyse".skill_gaps g
WHERE g.gap_score >= 0.5
  AND g.enseignant_id LIKE 'ENS%'
  AND NOT EXISTS (
    SELECT 1 FROM "analyse".alert_events a 
    WHERE a.enseignant_id = g.enseignant_id 
      AND a.competence_id = g.competence_id 
      AND a.type_alerte = 'BESOIN_NON_COUVERT'
  )
ON CONFLICT DO NOTHING;

-- Generate COMPLETION_FAIBLE alerts for teachers with no inscriptions in 30+ days
INSERT INTO "analyse".alert_events (type_alerte, cible_type, enseignant_id, severite, titre, message, statut, created_at)
SELECT DISTINCT ON (e.id)
  'COMPLETION_FAIBLE',
  'INDIVIDUEL',
  e.id,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM "formation".inscriptions i WHERE i.enseignant_id = e.id) THEN 'WARNING'
    WHEN (SELECT MAX(i.date_inscription) FROM "formation".inscriptions i WHERE i.enseignant_id = e.id) < NOW() - INTERVAL '60 days' THEN 'WARNING'
    ELSE 'INFO'
  END,
  'Complétion faible — ' || e.nom || ' ' || e.prenom,
  'Enseignant ' || e.id || ' (' || e.nom || ' ' || e.prenom || '): aucune formation suivie depuis plus de 30 jours.',
  'NOUVELLE',
  NOW() - (random() * interval '3 days')
FROM "formation".enseignants e
WHERE e.id LIKE 'ENS%'
  AND e.deleted_at IS NULL
  AND (
    NOT EXISTS (SELECT 1 FROM "formation".inscriptions i WHERE i.enseignant_id = e.id)
    OR (SELECT MAX(i.date_inscription) FROM "formation".inscriptions i WHERE i.enseignant_id = e.id) < NOW() - INTERVAL '30 days'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "analyse".alert_events a 
    WHERE a.enseignant_id = e.id 
      AND a.type_alerte = 'COMPLETION_FAIBLE'
      AND a.created_at > NOW() - INTERVAL '7 days'
  )
ON CONFLICT DO NOTHING;

-- Verify new counts
SELECT type_alerte, COUNT(*) FROM "analyse".alert_events GROUP BY type_alerte ORDER BY type_alerte;
SELECT 'total' as tbl, COUNT(*) FROM "analyse".alert_events;
