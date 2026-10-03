-- V21__link_web_teacher_levels_to_web_savoirs.sql
-- Rattache au référentiel WEB (V19) les niveaux DÉJÀ SAISIS des enseignants
-- du département Développement Web sur les savoirs équivalents de l'ancien
-- référentiel (DEV.*, RES.SEC).
--
-- Contexte : V19 a peuplé le domaine WEB avec ses propres savoirs (WEB.*).
-- Le périmètre des enseignants DEPT_WEB est devenu ces 6 compétences WEB,
-- mais tous leurs niveaux étaient saisis sur l'ancien référentiel. Effet
-- mesuré le 2026-09-23 : 6 enseignants sur 45 (ENS018-021, ENS035, ENS036)
-- analysés comme s'ils n'avaient AUCUN niveau sur leur périmètre (écarts
-- maximaux) et exclus du serving ML (« prédiction hors périmètre »), alors
-- que leurs niveaux existent.
--
-- Règle : un niveau n'est reporté que sur un savoir STRICTEMENT équivalent —
-- la même technologie ou la même notion est nommée des deux côtés. Chaque
-- correspondance est listée ci-dessous et vérifiable sans connaissance
-- extérieure. Aucun niveau n'est inventé : la valeur ET la date d'acquisition
-- sont celles de la saisie d'origine, qui reste en place.
--
--   Ancien savoir                       → Savoir WEB
--   S.API.OPENAPI   OpenAPI / Swagger   → WEB.BACK.DOC.SWAGGER   Documenter API OpenAPI
--   S.API.REST      Conception REST     → WEB.BACK.API.DESIGN    Concevoir API REST
--   S.SPRING.BOOT   Spring Boot 3       → WEB.BACK.SPRING.SVC    Développer service Spring Boot
--   S.SPRING.HIBER  Hibernate / JPA     → WEB.BACK.SPRING.JPA    Persister avec JPA
--   S.CRYPTO.JWT    JWT & OAuth2        → WEB.BACK.AUTH.JWT      Sécuriser avec JWT
--   S.SEC.OWASP10   OWASP Top 10        → WEB.QA.SEC.OWASP       Prévenir failles OWASP
--   S.DEVOPS.DOCKER Docker & Compose    → WEB.TOOLS.CICD.DOCKER  Déployer avec Docker
--   S.REACT.TS      React + TypeScript  → WEB.FRONT.TS.TYPES     Typer avec TypeScript
--   S.REACT.STATE   State Management    → WEB.FRONT.REACT.STATE  Gérer état et routage
--   S.TEST.JUNIT    JUnit 5 & Mockito   → WEB.QA.TEST.UNIT       Écrire tests unitaires
--
-- Volontairement NON reportés (correspondance partielle, pas identité) :
-- React Hooks → composants React, PostgreSQL avancé → requêter en SQL,
-- CI/CD GitHub Actions → déployer avec Docker, Spring Security → JWT,
-- Cypress (E2E) → tests unitaires, tests de pénétration → OWASP.
--
-- Périmètre : les 6 enseignants DEPT_WEB ayant des niveaux, listés
-- explicitement — le schéma competence n'a pas accès à formation.enseignants
-- (pas de lecture croisée). Les 31 autres enseignants qui détiennent ces
-- savoirs ne sont PAS touchés : leur périmètre n'est pas WEB.
--
-- Validé avant écriture (2026-09-23) : 10/10 couples résolus, 0 code fantôme,
-- 26 niveaux à reporter (ENS018:5, ENS019:7, ENS020:4, ENS021:5, ENS035:2,
-- ENS036:3). Idempotent : un niveau déjà saisi sur le savoir WEB n'est jamais
-- écrasé (ON CONFLICT DO NOTHING sur uq_enseignant_savoir).
-- Réversible : DELETE ... WHERE created_by = 'migration-equivalence-web-21'.

INSERT INTO enseignant_competences
    (enseignant_id, savoir_id, niveau, date_acquisition, commentaire, created_at, created_by, version)
SELECT ec.enseignant_id,
       nouveau.id,
       ec.niveau,
       ec.date_acquisition,
       'Niveau repris de ' || ancien.code || ' (savoir équivalent, référentiel WEB V19)',
       NOW(),
       'migration-equivalence-web-21',
       0
FROM (VALUES
        ('S.API.OPENAPI',   'WEB.BACK.DOC.SWAGGER'),
        ('S.API.REST',      'WEB.BACK.API.DESIGN'),
        ('S.SPRING.BOOT',   'WEB.BACK.SPRING.SVC'),
        ('S.SPRING.HIBER',  'WEB.BACK.SPRING.JPA'),
        ('S.CRYPTO.JWT',    'WEB.BACK.AUTH.JWT'),
        ('S.SEC.OWASP10',   'WEB.QA.SEC.OWASP'),
        ('S.DEVOPS.DOCKER', 'WEB.TOOLS.CICD.DOCKER'),
        ('S.REACT.TS',      'WEB.FRONT.TS.TYPES'),
        ('S.REACT.STATE',   'WEB.FRONT.REACT.STATE'),
        ('S.TEST.JUNIT',    'WEB.QA.TEST.UNIT')
     ) AS correspondance(code_ancien, code_nouveau)
JOIN savoirs ancien  ON ancien.code  = correspondance.code_ancien
JOIN savoirs nouveau ON nouveau.code = correspondance.code_nouveau
JOIN enseignant_competences ec ON ec.savoir_id = ancien.id
WHERE ec.enseignant_id IN ('ENS018', 'ENS019', 'ENS020', 'ENS021', 'ENS035', 'ENS036')
ON CONFLICT (enseignant_id, savoir_id) DO NOTHING;
