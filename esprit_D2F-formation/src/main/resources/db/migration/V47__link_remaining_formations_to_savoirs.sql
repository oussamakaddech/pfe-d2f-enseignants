-- V47 : rattache au referentiel les formations restantes hors Genie Civil.
--
-- PROBLEME
-- --------
-- Apres V46 (5 formations GC), 37 formations sur 50 n'avaient toujours aucun
-- lien dans formation.formation_competences. Le moteur de recommandation ne
-- pouvait pas les justifier : il retombait sur un a priori de domaine et la
-- page enseignant affichait « Justification indisponible ».
--
-- REGLE DE RATTACHEMENT (aucune invention)
-- ---------------------------------------
-- Meme regle que V46 : chaque lien est DEDUIT du contenu declare de la
-- formation (colonne competence, ou son titre quand la colonne est vide),
-- rapproche du savoir dont le libelle porte le meme intitule. Le contenu
-- declare est recopie en commentaire au-dessus de chaque bloc : la
-- correspondance est donc verifiable ligne a ligne, sans connaissance
-- exterieure au referentiel.
--
-- 27 formations rattachees, 74 liens crees.
--
-- NON RATTACHEES VOLONTAIREMENT
-- -----------------------------
-- Les formations 13, 18, 20, 21, 22, 24, 26, 27, 28, 29 sont des entrees de TEST
-- (« formation_test2 », « AAAAAAAAAAAAAAA », « vvvvvvv », « reactjs »,
-- « Formation Test Animateur E2E »...) : titre non signifiant et contenu vide.
-- Leur rattacher des savoirs reviendrait a inventer un programme. Elles
-- restent sans lien, et le moteur continue de le dire honnetement. Elles
-- devraient plutot etre archivees (soft-delete) — decision fonctionnelle,
-- hors perimetre d'une migration de donnees.
--
-- LIMITES ASSUMEES
-- ----------------
-- - Formation 17 « Data Engineering & Big Data » annonce Spark et Kafka, qui
--   n'existent PAS dans le referentiel : seul « pipelines de donnees »
--   (S.DATA.AIRFLOW) est rattache. Couverture partielle assumee plutot que
--   creation de savoirs hors referentiel.
-- - niveau_prerequis / niveau_vise restent nuls : le referentiel ne porte pas
--   le niveau de couverture par savoir.
--
-- Idempotent : NOT EXISTS sur (formation_id, savoir_id), rejouable sans
-- doublon. Resolution par CODE, jamais par id.

INSERT INTO formation.formation_competences (
    formation_id, domaine_id, competence_id, competence_nom,
    savoir_id, savoir_nom, savoir_type, created_at, created_by, version
)
SELECT
    m.formation_id, c.domaine_id, c.id, c.nom,
    s.id, s.nom, s.type, NOW(), 'seed-v47', 0
FROM (
    VALUES
--     3 [DEPT_GL] Introduction au Machine Learning avec Python
--       contenu declare : Python, Scikit-learn, Deep Learning
      (3, 'S.INFO.PYTHON'),
      (3, 'S.ML.SKLEARN'),
      (3, 'S.DL.TF'),
--
--    30 [DEPT_GL] Architecture Backend & APIs REST - Spring Boot
--       contenu declare : Spring Boot, JPA, APIs REST, OpenAPI
      (30, 'S.SPRING.BOOT'),
      (30, 'S.SPRING.HIBER'),
      (30, 'S.API.REST'),
      (30, 'S.API.OPENAPI'),
--
--    31 [DEPT_GL] Frontend Moderne - React & TypeScript
--       contenu declare : React, TypeScript, state management, UX
      (31, 'S.REACT.HOOKS'),
      (31, 'S.REACT.TS'),
      (31, 'S.REACT.STATE'),
--
--    32 [DEPT_GL] Qualite Logicielle - Tests, CI/CD
--       contenu declare : JUnit, Mockito, Cypress, CI/CD, SonarQube
      (32, 'S.TEST.JUNIT'),
      (32, 'S.TEST.CYPRESS'),
      (32, 'S.DEVOPS.CICD'),
--
--    17 [DEPT_IA] Data Engineering & Big Data
--       contenu declare : Spark, Kafka, pipelines de donnees, data lakes
      (17, 'S.DATA.AIRFLOW'),
--
--    19 [DEPT_IA] Formation Intelligence Artificielle
--       contenu declare : Machine Learning
      (19, 'S.ML.SKLEARN'),
      (19, 'S.ML.EVAL'),
--
--    38 [DEPT_IA] Machine Learning Supervise - scikit-learn
--       contenu declare : Regression, classification, validation croisee, metriques
      (38, 'S.ML.SKLEARN'),
      (38, 'S.ML.EVAL'),
--
--    39 [DEPT_IA] Deep Learning & Reseaux de Neurones
--       contenu declare : CNN, TensorFlow/PyTorch, transfer learning, NLP
      (39, 'S.DL.TF'),
--
--    40 [DEPT_IA] Pipelines Data - Pandas, Airflow & Visualisation
--       contenu declare : Pandas, Airflow, ETL, Power BI
      (40, 'S.DATA.PANDAS'),
      (40, 'S.DATA.AIRFLOW'),
      (40, 'S.DATA.POWERBI'),
--
--    51 [DEPT_INF2] Ingenierie Pedagogique & Conception de Cours
--       contenu declare : Objectifs pedagogiques, taxonomie de Bloom, FOAD
      (51, 'S.PED.BLOOM'),
      (51, 'S.PED.FOAD'),
--
--    52 [DEPT_INF2] Pedagogie Numerique - Moodle & Micro-learning
--       contenu declare : Moodle, LMS, videos, micro-learning
      (52, 'S.PED.MOODLE'),
      (52, 'S.PED.VIDEO'),
--
--     1 [DEPT_INFO] Atelier Spring Boot 3 & JPA Avance
--       contenu declare : Spring Boot, Hibernate, REST APIs
      (1, 'S.SPRING.BOOT'),
      (1, 'S.SPRING.HIBER'),
      (1, 'S.API.REST'),
--
--     6 [DEPT_INFO] Ingenierie Pedagogique et Conception de Cours
--       contenu declare : Conception Pedagogique, Bloom, APP
      (6, 'S.PED.BLOOM'),
--
--    15 [DEPT_INFO] DevOps & Conteneurisation : Docker et Kubernetes
--       contenu declare : Docker, Kubernetes, CI/CD, observabilite
      (15, 'S.DEVOPS.DOCKER'),
      (15, 'S.CLOUD.K8S'),
      (15, 'S.DEVOPS.CICD'),
--
--    25 [DEPT_INFO] Tests automatises - JUnit 5, Mockito, Cypress
--       contenu declare : (colonne vide : savoirs nommes dans le TITRE)
      (25, 'S.TEST.JUNIT'),
      (25, 'S.TEST.CYPRESS'),
--
--    33 [DEPT_INFO] Programmation Avancee & Algorithmique
--       contenu declare : Python, Java OOP, algorithmes, structures de donnees
      (33, 'S.INFO.PYTHON'),
      (33, 'S.INFO.JAVAOOP'),
      (33, 'S.INFO.ALGO'),
--
--    34 [DEPT_INFO] Bases de Donnees - Modelisation & SQL Avance
--       contenu declare : SQL, optimisation, modelisation relationnelle, NoSQL
      (34, 'S.INFO.SQLADV'),
      (34, 'S.DB.POSTGRESQL'),
--
--    35 [DEPT_INFO] Reseaux Informatiques & Protocoles TCP/IP
--       contenu declare : TCP/IP, routage, architecture reseau
      (35, 'S.INFO.TCPIP'),
--
--     5 [DEPT_RT] Docker, Kubernetes & CI/CD
--       contenu declare : Docker, Kubernetes, DevOps
      (5, 'S.DEVOPS.DOCKER'),
      (5, 'S.CLOUD.K8S'),
      (5, 'S.DEVOPS.CICD'),
--
--    36 [DEPT_RT] Administration Linux & Infrastructure as Code
--       contenu declare : Linux, Ansible, automatisation, cloud hybride
      (36, 'S.SYS.LINUX'),
      (36, 'S.SYS.ANSIBLE'),
--
--    37 [DEPT_RT] Securite Applicative Avancee & Pentest Web
--       contenu declare : OWASP, pentest, cryptographie, JWT/OAuth2
      (37, 'S.SEC.OWASP10'),
      (37, 'S.SEC.PENTEST'),
      (37, 'S.CRYPTO.JWT'),
--
--    16 [DEPT_WEB] Pedagogie active et evaluation par competences
--       contenu declare : Ingenierie pedagogique, evaluation par competences
      (16, 'S.PED.BLOOM'),
--
--    41 [DEPT_WEB] Frontend Web - HTML/CSS, JavaScript & React
--       contenu declare : HTML5, CSS, JS, React, responsive, TypeScript
      (41, 'WEB.FRONT.HTML.SEM'),
      (41, 'WEB.FRONT.HTML.CSS'),
      (41, 'WEB.FRONT.JS.ES6'),
      (41, 'WEB.FRONT.REACT.COMP'),
      (41, 'WEB.FRONT.RESP.MEDIA'),
      (41, 'WEB.FRONT.TS.TYPES'),
--
--    42 [DEPT_WEB] Backend Web - API Spring Boot, JWT & Swagger
--       contenu declare : API REST, authentification JWT, documentation OpenAPI
      (42, 'WEB.BACK.API.DESIGN'),
      (42, 'WEB.BACK.AUTH.JWT'),
      (42, 'WEB.BACK.DOC.SWAGGER'),
      (42, 'WEB.BACK.SPRING.SVC'),
--
--    43 [DEPT_WEB] Qualite & Securite des Applications Web
--       contenu declare : Tests unitaires, OWASP, performance, accessibilite
      (43, 'WEB.QA.TEST.UNIT'),
      (43, 'WEB.QA.SEC.OWASP'),
      (43, 'WEB.QA.PERF.OPTIM'),
      (43, 'WEB.UX.A11Y.WCAG'),
--
--    44 [DEPT_WEB] UX Design & Outils de Mise en Production Web
--       contenu declare : Figma, WCAG, SEO, Git, CI/CD Docker, Scrum
      (44, 'WEB.UX.DESIGN.FIGMA'),
      (44, 'WEB.UX.A11Y.WCAG'),
      (44, 'WEB.UX.SEO.TECH'),
      (44, 'WEB.TOOLS.GIT.FLOW'),
      (44, 'WEB.TOOLS.CICD.DOCKER'),
      (44, 'WEB.TOOLS.AGILE.SCRUM'),
--
--    45 [DEPT_WEB] Donnees pour le Web - SQL, JPA & NoSQL
--       contenu declare : SQL, JPA/Hibernate, MongoDB
      (45, 'WEB.DATA.SQL.QUERY'),
      (45, 'WEB.DATA.SQL.MODEL'),
      (45, 'WEB.DATA.NOSQL.MONGO'),
      (45, 'WEB.BACK.SPRING.JPA')
--
) AS m(formation_id, savoir_code)
JOIN competence.savoirs s
  ON s.code = m.savoir_code
JOIN competence.sous_competences sc
  ON sc.id = s.sous_competence_id
JOIN competence.competences c
  ON c.id = sc.competence_id
WHERE EXISTS (
    SELECT 1 FROM formation.formations f WHERE f.id_formation = m.formation_id
)
AND NOT EXISTS (
    SELECT 1 FROM formation.formation_competences fc
    WHERE fc.formation_id = m.formation_id AND fc.savoir_id = s.id
);
