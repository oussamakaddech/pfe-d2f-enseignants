-- Create affectations for ALL teachers who don't have any yet
-- Each teacher gets 3-6 random savoirs with random levels
INSERT INTO "competence".enseignant_competences (enseignant_id, savoir_id, niveau, created_at, updated_at)
SELECT DISTINCT ON (e.id, s.id)
  e.id as enseignant_id,
  s.id as savoir_id,
  (ARRAY['DEBUTANT', 'INITIE', 'CONFIRME', 'AVANCE', 'EXPERT'])[1 + (abs(hashtext(e.id || s.code)) % 5)] as niveau,
  NOW() - (random() * interval '30 days'),
  NOW() - (random() * interval '30 days')
FROM "formation".enseignants e
CROSS JOIN "competence".savoirs s
WHERE e.id LIKE 'ENS%'
  AND NOT EXISTS (
    SELECT 1 FROM "competence".enseignant_competences ec 
    WHERE ec.enseignant_id = e.id
  )
  AND (abs(hashtext(e.id || s.code)) % 5) < 3  -- ~60% chance per savoir
  AND s.id <= 20  -- Only use first 20 savoirs
ORDER BY e.id, s.id, random()
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;

-- Also add FORM001
INSERT INTO "competence".enseignant_competences (enseignant_id, savoir_id, niveau, created_at, updated_at)
SELECT 
  'FORM001',
  s.id,
  (ARRAY['DEBUTANT', 'INITIE', 'CONFIRME', 'AVANCE', 'EXPERT'])[1 + (abs(hashtext('FORM001' || s.code)) % 5)],
  NOW() - (random() * interval '30 days'),
  NOW() - (random() * interval '30 days')
FROM "competence".savoirs s
WHERE s.id <= 20
  AND (abs(hashtext('FORM001' || s.code)) % 5) < 3
  AND NOT EXISTS (
    SELECT 1 FROM "competence".enseignant_competences ec 
    WHERE ec.enseignant_id = 'FORM001' AND ec.savoir_id = s.id
  )
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;

-- Verify
SELECT enseignant_id, COUNT(*) as nb_savoirs 
FROM "competence".enseignant_competences 
GROUP BY enseignant_id 
ORDER BY enseignant_id;
