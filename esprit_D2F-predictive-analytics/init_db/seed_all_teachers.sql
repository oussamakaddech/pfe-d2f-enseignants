-- Seed comprehensive data for ALL ENS* teachers
-- Recommendations for every teacher based on their gaps
INSERT INTO "analyse".recommendations 
(enseignant_id, competence_id, formation_id, formation_titre, formation_type, score_pertinence, score_taux_reussite, score_disponibilite, score_global, probabilite_reussite, rang_dans_parcours, est_prerequis, prerequis_satisfaits, niveau_apres, justification, statut, created_at)
SELECT e.id, g.competence_id, 
  (g.competence_id * 100 + 1), 
  CASE g.competence_id
    WHEN 1 THEN 'Formation Backend Java/Spring Boot'
    WHEN 2 THEN 'Formation React & Frontend Moderne'
    WHEN 3 THEN 'Qualité Logicielle & Tests Unitaires'
    WHEN 4 THEN 'Sécurité Applicative OWASP'
    WHEN 6 THEN 'Machine Learning Fondamentaux'
    WHEN 8 THEN 'Ingénierie Pédagogique Avancée'
    WHEN 9 THEN 'Administration Cloud AWS/Azure'
    WHEN 12 THEN 'DevOps & Intégration Continue'
    ELSE 'Formation Transversale'
  END,
  'FORMATION', 
  ROUND((0.5 + random() * 0.4)::numeric, 4),
  ROUND((0.4 + random() * 0.4)::numeric, 4),
  ROUND((0.5 + random() * 0.4)::numeric, 4),
  ROUND((0.5 + random() * 0.35)::numeric, 4),
  ROUND((0.4 + random() * 0.4)::numeric, 4),
  ROW_NUMBER() OVER (PARTITION BY e.id ORDER BY g.gap_score DESC)::int,
  false, false, LEAST(g.niveau_requis, 5)::smallint,
  g.justification, 'ACTIVE', NOW() - (random() * interval '10 days')
FROM "analyse".teacher_risk_profiles e
JOIN "analyse".skill_gaps g ON g.enseignant_id = e.enseignant_id
WHERE e.enseignant_id LIKE 'ENS%'
  AND g.gap_score >= 0.5
  AND g.niveau_urgence IN ('HAUTE', 'CRITIQUE')
ON CONFLICT DO NOTHING;

-- Alerts for teachers with high gaps
INSERT INTO "analyse".alert_events 
(type_alerte, cible_type, enseignant_id, competence_id, severite, titre, message, statut, created_at)
SELECT 
  CASE WHEN g.niveau_urgence = 'CRITIQUE' THEN 'BESOIN_NON_COUVERT' ELSE 'GAP_CRITIQUE' END,
  'INDIVIDUEL', g.enseignant_id, g.competence_id,
  g.niveau_urgence, 
  g.competence_nom || ' — écart critique',
  'Enseignant ' || g.enseignant_id || ': écart de ' || ROUND(g.gap_score * 100) || '% en ' || g.competence_nom || '. Formation recommandée.',
  CASE WHEN random() > 0.6 THEN 'EN_COURS' ELSE 'NOUVELLE' END,
  NOW() - (random() * interval '14 days')
FROM "analyse".skill_gaps g
WHERE g.gap_score >= 0.7
  AND g.enseignant_id LIKE 'ENS%'
  AND NOT EXISTS (
    SELECT 1 FROM "analyse".alert_events a 
    WHERE a.enseignant_id = g.enseignant_id AND a.competence_id = g.competence_id
  )
ON CONFLICT DO NOTHING;

-- Risk history snapshots for all teachers (6 months of history)
INSERT INTO "analyse".teacher_risk_snapshots 
(enseignant_id, snapshot_date, score_risque, niveau_risque, tendance, computed_at)
SELECT 
  e.enseignant_id,
  (CURRENT_DATE - (m.n || ' months')::interval)::date,
  GREATEST(0.05, LEAST(0.95, e.score_risque + (random() - 0.5) * 0.2))::numeric(5,4),
  CASE 
    WHEN e.score_risque + (random() - 0.5) * 0.2 >= 0.75 THEN 'CRITIQUE'
    WHEN e.score_risque + (random() - 0.5) * 0.2 >= 0.5 THEN 'ELEVE'
    WHEN e.score_risque + (random() - 0.5) * 0.2 >= 0.25 THEN 'MODERE'
    ELSE 'FAIBLE'
  END,
  CASE 
    WHEN m.n = 0 THEN e.tendance
    WHEN random() > 0.6 THEN 'PROGRESSION'
    WHEN random() > 0.3 THEN 'STABLE'
    ELSE 'REGRESSION'
  END,
  NOW() - (m.n || ' months')::interval
FROM "analyse".teacher_risk_profiles e
CROSS JOIN generate_series(0, 6) AS m(n)
WHERE e.enseignant_id LIKE 'ENS%'
  AND NOT EXISTS (
    SELECT 1 FROM "analyse".teacher_risk_snapshots s 
    WHERE s.enseignant_id = e.enseignant_id AND s.snapshot_date = (CURRENT_DATE - (m.n || ' months')::interval)::date
  )
ON CONFLICT DO NOTHING;

-- Also update risk profiles to have more realistic distribution
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.8200, niveau_risque = 'CRITIQUE', tendance = 'REGRESSION' WHERE enseignant_id = 'ENS014';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.7500, niveau_risque = 'CRITIQUE', tendance = 'REGRESSION' WHERE enseignant_id = 'ENS022';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.6200, niveau_risque = 'ELEVE', tendance = 'STABLE' WHERE enseignant_id = 'ENS003';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.5500, niveau_risque = 'ELEVE', tendance = 'REGRESSION' WHERE enseignant_id = 'ENS017';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.5300, niveau_risque = 'ELEVE', tendance = 'REGRESSION' WHERE enseignant_id = 'ENS016';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.5200, niveau_risque = 'ELEVE', tendance = 'STABLE' WHERE enseignant_id = 'ENS012';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.2000, niveau_risque = 'FAIBLE', tendance = 'PROGRESSION' WHERE enseignant_id = 'ENS001';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.1000, niveau_risque = 'FAIBLE', tendance = 'STABLE' WHERE enseignant_id = 'ENS004';
UPDATE "analyse".teacher_risk_profiles SET score_risque = 0.1500, niveau_risque = 'FAIBLE', tendance = 'PROGRESSION' WHERE enseignant_id = 'ENS005';

SELECT 'recommendations' as tbl, COUNT(*) as total FROM "analyse".recommendations;
SELECT 'alert_events' as tbl, COUNT(*) as total FROM "analyse".alert_events;
SELECT 'risk_snapshots' as tbl, COUNT(*) as total FROM "analyse".teacher_risk_snapshots;
SELECT 'risk_profiles_high' as tbl, COUNT(*) as total FROM "analyse".teacher_risk_profiles WHERE score_risque >= 0.5;
