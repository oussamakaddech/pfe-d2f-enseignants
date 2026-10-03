-- V45 : seed de formations couvrant les competences de CHAQUE departement/UP.
--
-- Contexte : CANDIDATES_QUERY (predictive-analytics) filtre
--   f.departement_id = :dept_id OR f.up_id = :up_id
-- avec fc.competence_id = la competence en gap. Sans formation dans le
-- perimetre de l'enseignant liEEe a cette competence, toutes les API
-- renvoient recommendations: [] (constat GL : gaps DEV.* mais formations
-- en DEPT_INFO / DEPT_RT).
--
-- Couverture ciblee (etat PLANIFIE ou EN_COURS pour rester candidates) :
--   DEPT_GL    : DEV.BACK, DEV.FRONT, DEV.QA
--   DEPT_INFO  : INFO.PROG, INFO.BDD, INFO.RESEAUX
--   DEPT_RT    : RES.SEC, RES.INFRA, SYS.CLOUD
--   DEPT_IA    : AI.ML, AI.DL, DATA.ENG
--   DEPT_WEB   : WEB.FRONT, WEB.BACK, WEB.QA, WEB.UX, WEB.TOOLS, WEB.DATA
--   DEPT_GC    : GC-TECH-S, GC-TECH-C, GC-TECH-P, GC-TECH-E, GC-TECH-U, GC-TECH-T
--   DEPT_INF2  : PED.CONC, PED.NUM
--
-- Idempotent : WHERE NOT EXISTS sur titre_formation + NOT EXISTS sur les liens.

-- ═════════════════════════════════════════════════════════════════════════════
-- DEPT_GL / UP_GL — Developpement Logiciel
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Architecture Backend & APIs REST — Spring Boot',
    'Developpement Logiciel',
    'Spring Boot, JPA, APIs REST, OpenAPI',
    'Enseignants du departement Genie Logiciel',
    'Concevoir et documenter des APIs REST securisees avec Spring Boot',
    'Cours + TP encadre sur une API complete',
    'TP note + revue de code',
    'INTERNE', '2026-10-05', '2026-11-27', 'PLANIFIE',
    0.0, 24, false,
    'UP_GL', 'DEPT_GL', true, true, 'WINTER'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Architecture Backend & APIs REST — Spring Boot');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Frontend Moderne — React & TypeScript',
    'Developpement Logiciel',
    'React, TypeScript, state management, UX',
    'Enseignants du departement Genie Logiciel',
    'Construire des interfaces React typées et maintenables',
    'Atelier pratique sur un composant complet',
    'Projet frontend note',
    'INTERNE', '2026-11-10', '2027-01-15', 'PLANIFIE',
    0.0, 20, false,
    'UP_GL', 'DEPT_GL', true, true, 'WINTER'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Frontend Moderne — React & TypeScript');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Qualite Logicielle — Tests, CI/CD & Revue de Code',
    'Developpement Logiciel',
    'JUnit, Mockito, Cypress, CI/CD, SonarQube',
    'Enseignants du departement Genie Logiciel',
    'Mettre en place une strategie de tests et un pipeline CI/CD',
    'TP JUnit/Cypress + pipeline GitHub Actions',
    'Rapport de couverture + QCM',
    'INTERNE', '2027-02-02', '2027-03-26', 'PLANIFIE',
    0.0, 18, false,
    'UP_GL', 'DEPT_GL', true, true, 'SPRINT'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Qualite Logicielle — Tests, CI/CD & Revue de Code');

-- ═════════════════════════════════════════════════════════════════════════════
-- DEPT_INFO / UP_INFO — Informatique
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Programmation Avancee & Algorithmique',
    'Informatique',
    'Python, Java OOP, algorithmes, structures de donnees',
    'Enseignants du departement Informatique',
    'Renforcer les bases algorithmiques et la conception objet',
    'Exercices guidés + mini-projet',
    'QCM + projet pratique',
    'INTERNE', '2026-10-12', '2026-12-04', 'PLANIFIE',
    0.0, 22, false,
    'UP_INFO', 'DEPT_INFO', true, true, 'WINTER'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Programmation Avancee & Algorithmique');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Bases de Donnees — Modelisation & SQL Avance',
    'Informatique',
    'SQL, optimisation, modelisation relationnelle, NoSQL',
    'Enseignants du departement Informatique',
    'Modeliser et optimiser des bases de donnees relationnelles',
    'Atelier SQL avance sur jeux de donnees reels',
    'TP noté + etude de cas',
    'INTERNE', '2026-11-09', '2027-01-08', 'PLANIFIE',
    0.0, 20, false,
    'UP_INFO', 'DEPT_INFO', true, true, 'WINTER'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Bases de Donnees — Modelisation & SQL Avance');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Reseaux Informatiques & Protocoles TCP/IP',
    'Informatique',
    'TCP/IP, routage, architecture reseau',
    'Enseignants du departement Informatique',
    'Comprendre et expliquer les couches reseau TCP/IP',
    'Lab Packet Tracer / GNS3',
    'TP lab + QCM',
    'INTERNE', '2027-02-09', '2027-03-30', 'PLANIFIE',
    0.0, 18, false,
    'UP_INFO', 'DEPT_INFO', true, true, 'SPRINT'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Reseaux Informatiques & Protocoles TCP/IP');

-- ═════════════════════════════════════════════════════════════════════════════
-- DEPT_RT / UP_RT — Reseaux & Telecommunications
-- (RES.SEC via F2, RES.INFRA via F5 deja presents ; on complete SYS.CLOUD
--  avec departement explicite + un renfort securite actif)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Administration Linux & Infrastructure as Code',
    'Reseaux et Cybersecurite',
    'Linux, Ansible, automatisation, cloud hybride',
    'Enseignants du departement Reseaux & Telecoms',
    'Administrer des systemes Linux et automatiser avec Ansible',
    'Lab Ansible + Playbooks cibles',
    'TP lab note',
    'INTERNE', '2026-10-19', '2026-12-11', 'PLANIFIE',
    0.0, 24, false,
    'UP_RT', 'DEPT_RT', true, true, 'WINTER'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Administration Linux & Infrastructure as Code');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Securite Applicative Avancee & Pentest Web',
    'Reseaux et Cybersecurite',
    'OWASP, pentest, cryptographie, JWT/OAuth2',
    'Enseignants du departement Reseaux & Telecoms',
    'Auditer et durcir une application web de bout en bout',
    'CTF et atelier Burp Suite',
    'Rapport de pentest note',
    'INTERNE', '2027-01-12', '2027-03-05', 'PLANIFIE',
    0.0, 22, false,
    'UP_RT', 'DEPT_RT', true, true, 'SPRINT'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Securite Applicative Avancee & Pentest Web');

-- ═════════════════════════════════════════════════════════════════════════════
-- DEPT_IA / UP_IA — Intelligence Artificielle & Data
-- (DATA.ENG partiellement couvert par F7 UP_IA sans dept ; on complete AI.ML/AI.DL)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Machine Learning Supervise — scikit-learn en pratique',
    'Intelligence Artificielle & Data',
    'Regression, classification, validation croisee, metriques',
    'Enseignants du departement IA & Data',
    'Entrainer et evaluer des modeles ML classiques',
    'TP Jupyter sur donnees reels',
    'Mini-projet classification note',
    'INTERNE', '2026-10-07', '2026-11-25', 'PLANIFIE',
    0.0, 26, false,
    'UP_IA', 'DEPT_IA', true, true, 'WINTER'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Machine Learning Supervise — scikit-learn en pratique');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Deep Learning & Reseaux de Neurones',
    'Intelligence Artificielle & Data',
    'CNN, TensorFlow/PyTorch, transfer learning, NLP',
    'Enseignants du departement IA & Data',
    'Concevoir et entrainer un reseau de neurones sur un cas metier',
    'Lab GPU + notebook guide',
    'Projet CNN note',
    'INTERNE', '2026-11-16', '2027-01-22', 'PLANIFIE',
    0.0, 28, false,
    'UP_IA', 'DEPT_IA', true, true, 'WINTER'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Deep Learning & Reseaux de Neurones');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Pipelines Data — Pandas, Airflow & Visualisation',
    'Intelligence Artificielle & Data',
    'Pandas, Airflow, ETL, Power BI',
    'Enseignants du departement IA & Data',
    'Construire un pipeline de donnees de bout en bout',
    'TP Airflow + dashboard Power BI',
    'Projet pipeline note',
    'INTERNE', '2027-02-15', '2027-04-09', 'PLANIFIE',
    0.0, 24, false,
    'UP_IA', 'DEPT_IA', true, true, 'SPRINT'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Pipelines Data — Pandas, Airflow & Visualisation');

-- ═════════════════════════════════════════════════════════════════════════════
-- DEPT_WEB / UP_WEB — Developpement Web
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Frontend Web — HTML/CSS, JavaScript & React',
    'Developpement Web',
    'HTML5, CSS, JS, React, responsive, TypeScript',
    'Enseignants du departement Developpement Web',
    'Construire des interfaces web modernes et accessibles',
    'Atelier pas a pas sur un portfolio SPA',
    'Projet frontend note',
    'INTERNE', '2026-10-14', '2026-12-09', 'PLANIFIE',
    0.0, 24, false,
    'UP_WEB', 'DEPT_WEB', true, true, 'WINTER'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Frontend Web — HTML/CSS, JavaScript & React');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Backend Web — API Spring Boot, JWT & Swagger',
    'Developpement Web',
    'API REST, authentification JWT, documentation OpenAPI',
    'Enseignants du departement Developpement Web',
    'Developper un service backend securise et documente',
    'TP service REST complet',
    'API functionnelle + documentation notee',
    'INTERNE', '2026-11-11', '2027-01-13', 'PLANIFIE',
    0.0, 22, false,
    'UP_WEB', 'DEPT_WEB', true, true, 'WINTER'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Backend Web — API Spring Boot, JWT & Swagger');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Qualite & Securite des Applications Web',
    'Developpement Web',
    'Tests unitaires, OWASP, performance, accessibilite',
    'Enseignants du departement Developpement Web',
    'Tester, securiser et optimiser une application web',
    'Lab DVWA + Lighthouse',
    'Rapport de securite + suite de tests',
    'INTERNE', '2027-01-19', '2027-03-12', 'PLANIFIE',
    0.0, 20, false,
    'UP_WEB', 'DEPT_WEB', true, true, 'SPRINT'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Qualite & Securite des Applications Web');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'UX Design & Outils de Mise en Production Web',
    'Developpement Web',
    'Figma, WCAG, SEO, Git, CI/CD Docker, Scrum',
    'Enseignants du departement Developpement Web',
    'Maquetter, livrer et deployer une app web en equipe',
    'Workshop Figma + pipeline CI',
    'Projet equipe + soutenance',
    'INTERNE', '2027-02-22', '2027-04-16', 'PLANIFIE',
    0.0, 20, false,
    'UP_WEB', 'DEPT_WEB', true, true, 'SPRINT'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'UX Design & Outils de Mise en Production Web');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Donnees pour le Web — SQL, JPA & NoSQL',
    'Developpement Web',
    'SQL, JPA/Hibernate, MongoDB',
    'Enseignants du departement Developpement Web',
    'Modeliser et persister les donnees d''une app web',
    'TP modelisation + repository JPA',
    'TP note',
    'INTERNE', '2027-03-08', '2027-04-30', 'PLANIFIE',
    0.0, 18, false,
    'UP_WEB', 'DEPT_WEB', true, true, 'SPRINT'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Donnees pour le Web — SQL, JPA & NoSQL');

-- ═════════════════════════════════════════════════════════════════════════════
-- DEPT_GC / UP_GC — Genie Civil
-- (F11 BIM couvre deja GC-TECH-C et GC-TECH-T ; on complete S, P, E, U)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Geotechnique & Fondations — Sols et Risques',
    'Genie Civil',
    'Geologie, essais geotechniques, fondations, risques sismiques',
    'Enseignants du departement Genie Civil',
    'Interpreter une coupe geologique et dimensionner des fondations',
    'Lab essais de sol + etude de cas',
    'Dossier technique note',
    'INTERNE', '2026-10-13', '2026-12-08', 'PLANIFIE',
    0.0, 24, false,
    'UP_GC', 'DEPT_GC', true, true, 'WINTER'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Geotechnique & Fondations — Sols et Risques');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Physique du Batiment — Thermique & Acoustique',
    'Genie Civil',
    'Thermique, acoustique, equipements techniques du batiment',
    'Enseignants du departement Genie Civil',
    'Diagnostiquer la sante thermique et acoustique d un batiment',
    'Etude de cas + logiciel de simulation',
    'Rapport de diagnostic note',
    'INTERNE', '2026-11-17', '2027-01-12', 'PLANIFIE',
    0.0, 20, false,
    'UP_GC', 'DEPT_GC', true, true, 'WINTER'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Physique du Batiment — Thermique & Acoustique');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Hydraulique & Gestion de l Eau en GC',
    'Genie Civil',
    'Hydraulique, hydrologie, diagnostic environnemental',
    'Enseignants du departement Genie Civil',
    'Realiser un diagnostic hydrologique et hydraulique',
    'TP modelisation + etude d impacts',
    'Etude de cas notee',
    'INTERNE', '2027-02-16', '2027-04-13', 'PLANIFIE',
    0.0, 20, false,
    'UP_GC', 'DEPT_GC', true, true, 'SPRINT'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Hydraulique & Gestion de l Eau en GC');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Urbanisme & Amenagement du Territoire',
    'Genie Civil',
    'Analyse urbaine, diagnostic territorial, amenagement',
    'Enseignants du departement Genie Civil',
    'Concevoir un projet d amenagement urbain coherent',
    'Workshop maquette urbaine',
    'Projet d amenagement note',
    'INTERNE', '2027-03-15', '2027-05-07', 'PLANIFIE',
    0.0, 18, false,
    'UP_GC', 'DEPT_GC', true, true, 'SPRINT'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Urbanisme & Amenagement du Territoire');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Construction — Beton Arme & Ouvrages d Art',
    'Genie Civil',
    'Structure BA, ouvrages d art, infrastructure routiere',
    'Enseignants du departement Genie Civil',
    'Concevoir et dimensionner des structures en beton arme',
    'TP dimensionnement + logiciel de calcul',
    'Dossier de calcul note',
    'INTERNE', '2026-12-01', '2027-02-05', 'PLANIFIE',
    0.0, 26, false,
    'UP_GC', 'DEPT_GC', true, true, 'WINTER'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Construction — Beton Arme & Ouvrages d Art');

-- ═════════════════════════════════════════════════════════════════════════════
-- DEPT_INF2 / UP_INF2 — Pedagogie (aucune formation auparavant)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Ingenierie Pedagogique & Conception de Cours',
    'Pedagogie et Ingenierie de Formation',
    'Objectifs pédagogiques, taxonomie de Bloom, FOAD',
    'Enseignants de l UP Informatique & Infrastructures',
    'Concevoir un module aligne objectifs / evaluation / activites',
    'Atelier de conception guidée',
    'Scenario pedagogique note',
    'INTERNE', '2026-10-20', '2026-12-15', 'PLANIFIE',
    0.0, 18, false,
    'UP_INF2', 'DEPT_INF2', true, true, 'WINTER'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Ingenierie Pedagogique & Conception de Cours');

INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Pedagogie Numerique — Moodle & Micro-learning',
    'Pedagogie et Ingenierie de Formation',
    'Moodle, LMS, videos, micro-learning',
    'Enseignants de l UP Informatique & Infrastructures',
    'Animer un cours hybride avec Moodle et des contenus courts',
    'Lab Moodle + production micro-video',
    'Maquette de module Moodle notee',
    'INTERNE', '2027-01-26', '2027-03-19', 'PLANIFIE',
    0.0, 16, false,
    'UP_INF2', 'DEPT_INF2', true, true, 'SPRINT'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Pedagogie Numerique — Moodle & Micro-learning');

-- ═════════════════════════════════════════════════════════════════════════════
-- Liens formation ↔ competences (formation_competences)
-- competence_id resolu via competence.competences (schema competencememe BDD)
-- ═════════════════════════════════════════════════════════════════════════════

-- GL
INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'DEV.BACK'
WHERE f.titre_formation = 'Architecture Backend & APIs REST — Spring Boot'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'DEV.FRONT'
WHERE f.titre_formation = 'Frontend Moderne — React & TypeScript'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 1, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'DEV.QA'
WHERE f.titre_formation = 'Qualite Logicielle — Tests, CI/CD & Revue de Code'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

-- INFO
INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'INFO.PROG'
WHERE f.titre_formation = 'Programmation Avancee & Algorithmique'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'INFO.BDD'
WHERE f.titre_formation = 'Bases de Donnees — Modelisation & SQL Avance'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 1, 3, 0
FROM formations f
JOIN competence.competences c ON c.code = 'INFO.RESEAUX'
WHERE f.titre_formation = 'Reseaux Informatiques & Protocoles TCP/IP'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

-- RT : liens des NOUVELLES formations (F2/F5 deja lies)
INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'SYS.CLOUD'
WHERE f.titre_formation = 'Administration Linux & Infrastructure as Code'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'RES.SEC'
WHERE f.titre_formation = 'Securite Applicative Avancee & Pentest Web'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'RES.INFRA'
WHERE f.titre_formation = 'Securite Applicative Avancee & Pentest Web'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

-- IA
INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'AI.ML'
WHERE f.titre_formation = 'Machine Learning Supervise — scikit-learn en pratique'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 3, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'AI.DL'
WHERE f.titre_formation = 'Deep Learning & Reseaux de Neurones'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'DATA.ENG'
WHERE f.titre_formation = 'Pipelines Data — Pandas, Airflow & Visualisation'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

-- WEB
INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 1, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'WEB.FRONT'
WHERE f.titre_formation = 'Frontend Web — HTML/CSS, JavaScript & React'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'WEB.BACK'
WHERE f.titre_formation = 'Backend Web — API Spring Boot, JWT & Swagger'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'WEB.QA'
WHERE f.titre_formation = 'Qualite & Securite des Applications Web'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'WEB.UX'
WHERE f.titre_formation = 'UX Design & Outils de Mise en Production Web'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'WEB.TOOLS'
WHERE f.titre_formation = 'UX Design & Outils de Mise en Production Web'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'WEB.DATA'
WHERE f.titre_formation = 'Donnees pour le Web — SQL, JPA & NoSQL'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

-- GC
INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'GC-TECH-S'
WHERE f.titre_formation = 'Geotechnique & Fondations — Sols et Risques'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'GC-TECH-P'
WHERE f.titre_formation = 'Physique du Batiment — Thermique & Acoustique'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'GC-TECH-E'
WHERE f.titre_formation = 'Hydraulique & Gestion de l Eau en GC'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'GC-TECH-U'
WHERE f.titre_formation = 'Urbanisme & Amenagement du Territoire'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'GC-TECH-C'
WHERE f.titre_formation = 'Construction — Beton Arme & Ouvrages d Art'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

-- INF2 / Pedagogie
INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'PED.CONC'
WHERE f.titre_formation = 'Ingenierie Pedagogique & Conception de Cours'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 1, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'PED.NUM'
WHERE f.titre_formation = 'Pedagogie Numerique — Moodle & Micro-learning'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

-- Liens manquants sur formations existantes (F15, F16, F17, F19, F25)
INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'DEV.QA'
WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'PED.CONC'
WHERE f.titre_formation = 'Pédagogie active et évaluation par compétences'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'DATA.ENG'
WHERE f.titre_formation = 'Data Engineering & Big Data : fondations'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 2, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'AI.ML'
WHERE f.titre_formation = 'Formation Intelligence Artificielle - Niveau 1'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);

INSERT INTO formation_competences (formation_id, competence_id, competence_nom, niveau_prerequis, niveau_vise, version)
SELECT f.id_formation, c.id, c.nom, 1, 4, 0
FROM formations f
JOIN competence.competences c ON c.code = 'DEV.QA'
WHERE f.titre_formation = 'Tests automatisés — JUnit 5, Mockito, Cypress'
  AND NOT EXISTS (SELECT 1 FROM formation_competences fc WHERE fc.formation_id = f.id_formation AND fc.competence_id = c.id);
