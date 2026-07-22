-- V11__seed_niveau_savoir_requis.sql
-- Donnees d'exemple : niveaux requis par savoir pour le calcul des skill gaps.
-- Utilise par le predictive-analytics service (GapEngine) pour determiner les ecarts.

INSERT INTO niveau_savoir_requis (savoir_id, competence_id, sous_competence_id, niveau, description, created_at, created_by, version)
SELECT s.id, c.id, sc.id, 'N3_INTERMEDIAIRE', 'Niveau requis pour ' || s.nom, '2026-01-01 08:00:00', 'migration-seed', 0
FROM savoirs s
JOIN sous_competences sc ON sc.id = s.sous_competence_id
JOIN competences c ON c.id = sc.competence_id
WHERE s.code IN ('S.SPRING.BOOT','S.SPRING.SEC','S.API.REST','S.DB.POSTGRESQL','S.REACT.HOOKS','S.TEST.JUNIT','S.DEVOPS.DOCKER','S.SEC.OWASP10','S.SEC.PENTEST','S.CRYPTO.JWT','S.CLOUD.K8S','S.ML.SKLEARN','S.ML.EVAL','S.PED.BLOOM')
ON CONFLICT DO NOTHING;

INSERT INTO niveau_savoir_requis (savoir_id, competence_id, sous_competence_id, niveau, description, created_at, created_by, version)
SELECT s.id, c.id, sc.id, 'N2_ELEMENTAIRE', 'Niveau requis pour ' || s.nom, '2026-01-01 08:00:00', 'migration-seed', 0
FROM savoirs s
JOIN sous_competences sc ON sc.id = s.sous_competence_id
JOIN competences c ON c.id = sc.competence_id
WHERE s.code IN ('S.SPRING.HIBER','S.API.OPENAPI','S.DB.FLYWAY','S.REACT.TS','S.TEST.CYPRESS','S.DEVOPS.CICD','S.REACT.STATE','S.ML.CLUSTER','S.DL.TF','S.PED.FOAD')
ON CONFLICT DO NOTHING;
