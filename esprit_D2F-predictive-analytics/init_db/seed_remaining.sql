-- Seed recommendations for ALL teachers with gaps but no recommendations
INSERT INTO "analyse".recommendations 
(enseignant_id, competence_id, formation_id, formation_titre, formation_type, score_pertinence, score_taux_reussite, score_disponibilite, score_global, probabilite_reussite, rang_dans_parcours, est_prerequis, prerequis_satisfaits, niveau_apres, justification, statut, created_at)
SELECT DISTINCT ON (g.enseignant_id, g.competence_id)
  g.enseignant_id, g.competence_id, 
  (g.competence_id * 100 + g.id % 50 + 1), 
  g.competence_nom || ' — formation recommandée',
  'FORMATION', 
  GREATEST(0.4, LEAST(0.98, g.gap_score * 0.9 + 0.1)),
  GREATEST(0.4, LEAST(0.95, 1.0 - g.gap_score * 0.3)),
  GREATEST(0.5, LEAST(0.98, 0.8 - g.gap_score * 0.05)),
  GREATEST(0.4, LEAST(0.98, g.gap_score * 0.85 + (CASE g.niveau_urgence WHEN 'CRITIQUE' THEN 0.10 WHEN 'HAUTE' THEN 0.05 ELSE 0.0 END))),
  GREATEST(0.4, LEAST(0.95, g.gap_score * 0.7 + (CASE WHEN g.niveau_urgence = 'CRITIQUE' THEN 0.08 ELSE 0.02 END))),
  ROW_NUMBER() OVER (PARTITION BY g.enseignant_id ORDER BY g.priorite_score DESC),
  false, false, LEAST(g.niveau_requis, 5)::smallint,
  'Ecart de ' || ROUND(g.gap_score * 100) || '% — niveau ' || g.niveau_actuel || ' vs requis ' || g.niveau_requis,
  'ACTIVE', NOW() - (random() * interval '7 days')
FROM "analyse".skill_gaps g
WHERE g.gap_score >= 0.3
  AND g.enseignant_id LIKE 'ENS%'
  AND NOT EXISTS (
    SELECT 1 FROM "analyse".recommendations r 
    WHERE r.enseignant_id = g.enseignant_id AND r.competence_id = g.competence_id
  )
ON CONFLICT DO NOTHING;

-- Seed risk history for ALL teachers who don't have any yet
INSERT INTO "analyse".teacher_risk_snapshots 
(enseignant_id, snapshot_date, score_risque, niveau_risque, tendance, computed_at)
SELECT DISTINCT ON (e.enseignant_id, (CURRENT_DATE - (m.n || ' months')::interval)::date)
  e.enseignant_id,
  (CURRENT_DATE - (m.n || ' months')::interval)::date,
  GREATEST(0.05, LEAST(0.95, e.score_risque + (random() - 0.5) * 0.15))::numeric(5,4),
  CASE 
    WHEN e.score_risque + (random() - 0.5) * 0.15 >= 0.75 THEN 'CRITIQUE'
    WHEN e.score_risque + (random() - 0.5) * 0.15 >= 0.5 THEN 'ELEVE'
    WHEN e.score_risque + (random() - 0.5) * 0.15 >= 0.25 THEN 'MODERE'
    ELSE 'FAIBLE'
  END,
  CASE 
    WHEN m.n = 0 THEN e.tendance
    WHEN m.n <= 2 THEN 'STABLE'
    WHEN random() > 0.5 THEN 'PROGRESSION'
    ELSE 'STABLE'
  END,
  NOW() - (m.n || ' months')::interval
FROM "analyse".teacher_risk_profiles e
CROSS JOIN generate_series(0, 6) AS m(n)
WHERE e.enseignant_id LIKE 'ENS%'
  AND NOT EXISTS (
    SELECT 1 FROM "analyse".teacher_risk_snapshots s 
    WHERE s.enseignant_id = e.enseignant_id 
      AND s.snapshot_date = (CURRENT_DATE - (m.n || ' months')::interval)::date
  );

SELECT 'total_recs' as tbl, COUNT(*) as cnt FROM "analyse".recommendations;
SELECT 'teachers_with_recs' as tbl, COUNT(DISTINCT enseignant_id) as cnt FROM "analyse".recommendations;
SELECT 'teachers_with_history' as tbl, COUNT(DISTINCT enseignant_id) as cnt FROM "analyse".teacher_risk_snapshots;
