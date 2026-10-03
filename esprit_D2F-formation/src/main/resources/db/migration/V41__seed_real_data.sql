-- =============================================================================
-- V41__seed_real_data.sql
-- Données réelles de démonstration : enrichissement des fiches enseignants
-- (grade, téléphone, spécialité, date de recrutement, lien compte auth),
-- nouvelles fiches ENS007..ENS013, formations réalistes (EN_COURS / PLANIFIE,
-- interne et externe), séances numérotées, inscriptions, présences et
-- animateurs.
--
-- Idempotent : UPDATE ciblés + ON CONFLICT / WHERE NOT EXISTS sur les INSERT.
-- Liens comptes : les user_id référencent les comptes seedés dans le service
-- authentification (V14 / V22). Aucune FK SQL (bases distinctes).
-- =============================================================================

-- ── Enrichissement des fiches existantes (V16) ────────────────────────────────
UPDATE enseignants SET
    grade = 'Maître assistant', telephone = '+21671234502',
    specialite = 'Génie logiciel, Java/JEE', date_recrutement = '2018-09-01',
    dossier_status = 'COMPLET', user_id = '00000000-0000-0000-0000-00000ens0001'
WHERE id = 'ENS001';

UPDATE enseignants SET
    grade = 'Maître de conférences', telephone = '+21671234503',
    specialite = 'Cybersécurité, réseaux', date_recrutement = '2015-09-01',
    dossier_status = 'COMPLET', user_id = '00000000-0000-0000-0000-00000ens0002'
WHERE id = 'ENS002';

UPDATE enseignants SET
    grade = 'Assistant', telephone = '+21671234504',
    specialite = 'Réseaux, administration systèmes', date_recrutement = '2021-09-01',
    dossier_status = 'EN_COURS', user_id = '00000000-0000-0000-0000-00000ens0003'
WHERE id = 'ENS003';

UPDATE enseignants SET
    grade = 'Professeur', telephone = '+21671234505',
    specialite = 'Génie civil, BTP durable', date_recrutement = '2012-09-01',
    dossier_status = 'COMPLET', user_id = '00000000-0000-0000-0000-00000ens0004'
WHERE id = 'ENS004';

UPDATE enseignants SET
    grade = 'Maître assistant', telephone = '+21671234506',
    specialite = 'Systèmes d''information, CUP', date_recrutement = '2017-09-01',
    dossier_status = 'COMPLET', user_id = '00000000-0000-0000-0000-00000ens0005'
WHERE id = 'ENS005';

UPDATE enseignants SET
    grade = 'Consultant formateur', telephone = '+21671234507',
    specialite = 'Architecture logicielle', date_recrutement = '2024-01-15',
    dossier_status = 'COMPLET', user_id = '00000000-0000-0000-0000-0000form0001'
WHERE id = 'ENS006';

-- ── Nouvelles fiches enseignants ───────────────────────────────────────────────
-- type : P=Permanent, V=Vacataire ; etat : A=Actif, I=Inactif
-- cup / chef_departement : O=Oui, N=Non
INSERT INTO enseignants (id, nom, prenom, mail, type, etat, cup, chef_departement,
                         up_id, dept_id, grade, telephone, specialite,
                         date_recrutement, dossier_status, user_id) VALUES
    ('ENS007', 'CHEBBI',   'Nadia',  'n.chebbi@esprit.tn',  'P', 'A', 'N', 'N',
     'UP_GL',   'DEPT_GL',  'Maître assistant',       '+21671234601', 'Génie logiciel, agilité',
     '2019-09-01', 'COMPLET', '00000000-0000-0000-0000-000000ani001'),
    ('ENS008', 'BOUZID',   'Ahmed',  'a.bouzid@esprit.tn',  'P', 'A', 'N', 'N',
     'UP_RT',   'DEPT_RT',  'Maître de conférences',  '+21671234602', 'Réseaux, cloud & virtualisation',
     '2014-09-01', 'COMPLET', '00000000-0000-0000-0000-000000ani002'),
    ('ENS009', 'KHELIFI',  'Hela',   'h.khelifi@esprit.tn', 'P', 'A', 'N', 'N',
     'UP_INFO', 'DEPT_INFO','Assistant',              '+21671234606', 'Bases de données, SQL avancé',
     '2022-09-01', 'EN_COURS', '00000000-0000-0000-0000-00000ens0010'),
    ('ENS010', 'MEZGHANI', 'Rami',   'r.mezghani@esprit.tn','P', 'A', 'N', 'N',
     'UP_GL',   'DEPT_GL',  'Maître assistant',       '+21671234607', 'DevOps, CI/CD, conteneurisation',
     '2020-09-01', 'COMPLET', '00000000-0000-0000-0000-00000ens0011'),
    ('ENS011', 'AYARI',    'Ines',   'i.ayari@esprit.tn',   'P', 'A', 'N', 'N',
     'UP_IA',   'DEPT_IA',  'Assistant',              '+21671234608', 'Machine learning, data engineering',
     '2023-09-01', 'EN_COURS', '00000000-0000-0000-0000-00000ens0012'),
    ('ENS012', 'ZOUARI',   'Tarek',  't.zouari@esprit.tn',  'V', 'A', 'N', 'N',
     NULL,      NULL,       'Consultant DevOps',      '+21671234609', 'Docker, Kubernetes, observabilité',
     '2025-01-10', 'COMPLET', '00000000-0000-0000-0000-00000ens0013'),
    ('ENS013', 'BOUAZIZI', 'Samir',  's.bouazizi@esprit.tn','P', 'A', 'N', 'O',
     'UP_WEB',  'DEPT_WEB', 'Professeur',             '+21671234604', 'Développement web, pédagogie',
     '2010-09-01', 'COMPLET', '00000000-0000-0000-0000-000000chd002')
ON CONFLICT (id) DO NOTHING;

-- ── Formations réalistes ───────────────────────────────────────────────────────
-- etat_formation : PLANIFIE | EN_COURS | ACHEVE
-- period_code    : WINTER | SUMMER | SPRINT | WORKSHOP | OTHER
-- type_seance    : THEORIQUE | PRATIQUE | MIXTE

-- Formation 4 — EN_COURS (interne, DevOps) ─────────────────────────────────────
INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code,
    salle, responsable_name, responsable_email
) SELECT
    'INTERNE',
    'DevOps & Conteneurisation : Docker et Kubernetes',
    'DevOps & Cloud',
    'Docker, Kubernetes, CI/CD, observabilité',
    'Enseignants des départements Informatique et Génie Logiciel',
    'Conteneuriser, orchestrer et déployer des applications avec Docker et Kubernetes',
    'À l''issue de la formation, les participants seront capables de construire un pipeline CI/CD complet et de déployer sur un cluster Kubernetes',
    'TP notés + projet final de déploiement',
    'INTERNE', '2026-08-20', '2026-10-15', 'EN_COURS',
    0.0, 28, false,
    'UP_INFO', 'DEPT_INFO', true, true, 'SUMMER',
    'Salle A104', 'Fatima BEN HASSEN', 'f.benhassen@esprit.tn'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes');

-- Formation 5 — PLANIFIE (interne, pédagogie) ──────────────────────────────────
INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code,
    salle, responsable_name, responsable_email
) SELECT
    'INTERNE',
    'Pédagogie active et évaluation par compétences',
    'Pédagogie universitaire',
    'Ingénierie pédagogique, évaluation par compétences, classe inversée',
    'Tous les enseignants permanents et vacataires ESPRIT',
    'Concevoir des séances actives et aligner les évaluations sur les compétences visées',
    'Construire un scénario pédagogique complet et une grille d''évaluation par compétences',
    'Portfolio pédagogique + atelier d''analyse entre pairs',
    'INTERNE', '2026-11-05', '2026-12-18', 'PLANIFIE',
    0.0, 18, false,
    'UP_WEB', 'DEPT_WEB', true, true, 'WINTER',
    'Amphi B', 'Mohamed JEBARI', 'm.jebari@esprit.tn'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Pédagogie active et évaluation par compétences');

-- Formation 6 — PLANIFIE (externe, data engineering) ───────────────────────────
INSERT INTO formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation,
    externe_formateur_nom, externe_formateur_prenom, externe_formateur_email,
    organisme_ref_externe,
    date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code,
    salle, responsable_name, responsable_email
) SELECT
    'EXTERNE',
    'Data Engineering & Big Data : fondations',
    'Intelligence Artificielle & Data',
    'Spark, Kafka, pipelines de données, data lakes',
    'Enseignants des départements IA & Data et Informatique',
    'Maîtriser les fondamentaux des architectures Big Data et construire un pipeline batch/streaming',
    'Concevoir un pipeline de données de bout en bout (ingestion, transformation, restitution)',
    'Étude de cas notée + QCM final',
    'EXTERNE',
    'BERNARD', 'Lucas', 'l.bernard@dataacademy.fr',
    'Data Academy Paris',
    '2026-10-01', '2026-11-30', 'PLANIFIE',
    2200.0, 24, false,
    'UP_IA', 'DEPT_IA', true, true, 'WINTER',
    'Salle C301', 'Fatima BEN HASSEN', 'f.benhassen@esprit.tn'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Data Engineering & Big Data : fondations');

-- ── Séances — Formation 4 : DevOps & Conteneurisation (EN_COURS) ─────────────
-- Séances passées (présences saisies) + séances à venir.

-- Séance 1/4 — passée (statut CLOSED)
INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id,
    session_number, total_sessions, session_status
)
SELECT '2026-08-20', '09:00', '12:30', 'MIXTE',
       'Introduction à Docker : images, conteneurs, volumes, réseaux',
       'Cours magistral + TP manipulations Docker',
       1.5, 2.0, 'Salle A104',
       f.id_formation, 1, 4, 'CLOSED'
FROM formations f WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-08-20'
);

-- Séance 2/4 — passée (statut CLOSED)
INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id,
    session_number, total_sessions, session_status
)
SELECT '2026-09-03', '09:00', '12:30', 'PRATIQUE',
       'Dockerfile avancé, multi-stage builds, docker-compose multi-services',
       'TP guidé en binôme + revue de code',
       1.0, 2.5, 'Salle A104',
       f.id_formation, 2, 4, 'CLOSED'
FROM formations f WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-09-03'
);

-- Séance 3/4 — à venir (statut TEAMS)
INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id,
    session_number, total_sessions, session_status
)
SELECT '2026-09-17', '09:00', '12:30', 'MIXTE',
       'Kubernetes : pods, deployments, services, ingress',
       'Démo live sur cluster kind + TP',
       2.0, 1.5, 'Salle A104',
       f.id_formation, 3, 4, 'TEAMS'
FROM formations f WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-09-17'
);

-- Séance 4/4 — à venir (statut OPEN)
INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id,
    session_number, total_sessions, session_status
)
SELECT '2026-10-15', '09:00', '12:30', 'PRATIQUE',
       'CI/CD : GitHub Actions, déploiement continu, monitoring Prometheus',
       'Projet final : pipeline complet de bout en bout',
       0.5, 3.0, 'Salle A104',
       f.id_formation, 4, 4, 'OPEN'
FROM formations f WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-10-15'
);

-- ── Séances — Formation 5 : Pédagogie active (PLANIFIE) ─────────────────────
-- Séance 1/3
INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id,
    session_number, total_sessions, session_status
)
SELECT '2026-11-05', '14:00', '17:00', 'THEORIQUE',
       'Alignement pédagogique : objectifs, compétences, évaluation',
       'Atelier d''analyse de scénarios existants',
       2.0, 1.0, 'Amphi B',
       f.id_formation, 1, 3, 'OPEN'
FROM formations f WHERE f.titre_formation = 'Pédagogie active et évaluation par compétences'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-11-05'
);

-- Séance 2/3
INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id,
    session_number, total_sessions, session_status
)
SELECT '2026-11-26', '14:00', '17:00', 'MIXTE',
       'Classe inversée, apprentissage par problèmes, travail en équipe',
       'Micro-enseignement filmé + feedback entre pairs',
       1.5, 1.5, 'Amphi B',
       f.id_formation, 2, 3, 'OPEN'
FROM formations f WHERE f.titre_formation = 'Pédagogie active et évaluation par compétences'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-11-26'
);

-- Séance 3/3
INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id,
    session_number, total_sessions, session_status
)
SELECT '2026-12-18', '14:00', '17:00', 'PRATIQUE',
       'Grilles d''évaluation par compétences, portfolio, remediation',
       'Construction d''une grille d''évaluation pour son propre cours',
       1.0, 2.0, 'Amphi B',
       f.id_formation, 3, 3, 'OPEN'
FROM formations f WHERE f.titre_formation = 'Pédagogie active et évaluation par compétences'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-12-18'
);

-- ── Séances — Formation 6 : Data Engineering & Big Data (PLANIFIE) ──────────
-- Séance 1/3
INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id,
    session_number, total_sessions, session_status
)
SELECT '2026-10-01', '09:00', '16:00', 'THEORIQUE',
       'Écosystème Big Data : HDFS, data lakes, architectures lambda/kappa',
       'Cours + étude de cas d''architecture',
       3.0, 3.0, 'Salle C301',
       f.id_formation, 1, 3, 'OPEN'
FROM formations f WHERE f.titre_formation = 'Data Engineering & Big Data : fondations'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-10-01'
);

-- Séance 2/3
INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id,
    session_number, total_sessions, session_status
)
SELECT '2026-10-29', '09:00', '16:00', 'PRATIQUE',
       'Apache Spark : DataFrames, transformations, Spark SQL',
       'TP sur cluster Spark (jeux de données réels)',
       2.0, 4.0, 'Salle C301',
       f.id_formation, 2, 3, 'OPEN'
FROM formations f WHERE f.titre_formation = 'Data Engineering & Big Data : fondations'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-10-29'
);

-- Séance 3/3
INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id,
    session_number, total_sessions, session_status
)
SELECT '2026-11-30', '09:00', '16:00', 'MIXTE',
       'Kafka streaming + pipeline complet batch/streaming de bout en bout',
       'Mini-projet évalué en équipe',
       2.0, 4.0, 'Salle C301',
       f.id_formation, 3, 3, 'OPEN'
FROM formations f WHERE f.titre_formation = 'Data Engineering & Big Data : fondations'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-11-30'
);

-- ── Inscriptions — Formation 4 : DevOps & Conteneurisation (EN_COURS) ────────
INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS001', 'APPROVED', '2026-07-20 09:30:00+02'
FROM formations f WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS001'
);

INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS002', 'APPROVED', '2026-07-21 10:00:00+02'
FROM formations f WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS002'
);

INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS003', 'APPROVED', '2026-07-25 11:15:00+02'
FROM formations f WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS003'
);

INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS011', 'APPROVED', '2026-07-28 14:00:00+02'
FROM formations f WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS011'
);

INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS012', 'REJECTED', '2026-07-30 09:00:00+02'
FROM formations f WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS012'
);

-- ── Inscriptions — Formation 5 : Pédagogie active (PLANIFIE) ─────────────────
INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS004', 'APPROVED', '2026-10-05 09:00:00+02'
FROM formations f WHERE f.titre_formation = 'Pédagogie active et évaluation par compétences'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS004'
);

INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS007', 'APPROVED', '2026-10-06 10:30:00+02'
FROM formations f WHERE f.titre_formation = 'Pédagogie active et évaluation par compétences'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS007'
);

INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS009', 'PENDING', '2026-10-08 15:45:00+02'
FROM formations f WHERE f.titre_formation = 'Pédagogie active et évaluation par compétences'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS009'
);

INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS013', 'APPROVED', '2026-10-09 08:30:00+02'
FROM formations f WHERE f.titre_formation = 'Pédagogie active et évaluation par compétences'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS013'
);

-- ── Inscriptions — Formation 6 : Data Engineering & Big Data (PLANIFIE) ──────
INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS005', 'APPROVED', '2026-09-01 09:00:00+02'
FROM formations f WHERE f.titre_formation = 'Data Engineering & Big Data : fondations'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS005'
);

INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS011', 'APPROVED', '2026-09-02 10:15:00+02'
FROM formations f WHERE f.titre_formation = 'Data Engineering & Big Data : fondations'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS011'
);

INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS009', 'PENDING', '2026-09-03 11:30:00+02'
FROM formations f WHERE f.titre_formation = 'Data Engineering & Big Data : fondations'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS009'
);

-- ── Présences — Séances terminées de Formation 4 (DevOps) ────────────────────
-- Séance 1/4 du 20/08 — ENS001 présent, ENS002 présent, ENS003 présent, ENS011 absent
INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT true, NULL, s.id_seance, 'ENS001'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes' AND s.date_seance = '2026-08-20'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS001');

INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT true, NULL, s.id_seance, 'ENS002'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes' AND s.date_seance = '2026-08-20'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS002');

INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT true, NULL, s.id_seance, 'ENS003'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes' AND s.date_seance = '2026-08-20'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS003');

INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT false, 'Absence justifiée (soutenance de thèse)', s.id_seance, 'ENS011'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes' AND s.date_seance = '2026-08-20'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS011');

-- Séance 2/4 du 03/09 — ENS001 présent, ENS002 présent, ENS003 absent, ENS011 présent
INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT true, NULL, s.id_seance, 'ENS001'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes' AND s.date_seance = '2026-09-03'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS001');

INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT true, NULL, s.id_seance, 'ENS002'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes' AND s.date_seance = '2026-09-03'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS002');

INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT false, 'Absence non justifiée', s.id_seance, 'ENS003'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes' AND s.date_seance = '2026-09-03'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS003');

INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT true, NULL, s.id_seance, 'ENS011'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes' AND s.date_seance = '2026-09-03'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS011');

-- ── Animateurs des nouvelles formations ───────────────────────────────────────
-- Formation 4 (DevOps) : ENS010 MEZGHANI (animateur principal) + ENS012 ZOUARI (vacataire DevOps)
INSERT INTO formation_animateur (formation_id, enseignant_id)
SELECT f.id_formation, 'ENS010'
FROM formations f WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
AND NOT EXISTS (
    SELECT 1 FROM formation_animateur fa
    WHERE fa.formation_id = f.id_formation AND fa.enseignant_id = 'ENS010'
);

INSERT INTO formation_animateur (formation_id, enseignant_id)
SELECT f.id_formation, 'ENS012'
FROM formations f WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
AND NOT EXISTS (
    SELECT 1 FROM formation_animateur fa
    WHERE fa.formation_id = f.id_formation AND fa.enseignant_id = 'ENS012'
);

-- Formation 5 (Pédagogie) : ENS013 BOUAZIZI (chef de département Web)
INSERT INTO formation_animateur (formation_id, enseignant_id)
SELECT f.id_formation, 'ENS013'
FROM formations f WHERE f.titre_formation = 'Pédagogie active et évaluation par compétences'
AND NOT EXISTS (
    SELECT 1 FROM formation_animateur fa
    WHERE fa.formation_id = f.id_formation AND fa.enseignant_id = 'ENS013'
);

INSERT INTO formation_animateur (formation_id, enseignant_id)
SELECT f.id_formation, 'ENS007'
FROM formations f WHERE f.titre_formation = 'Pédagogie active et évaluation par compétences'
AND NOT EXISTS (
    SELECT 1 FROM formation_animateur fa
    WHERE fa.formation_id = f.id_formation AND fa.enseignant_id = 'ENS007'
);

-- Formation 6 (Data Eng.) : animateur externe via ENS011 (référente interne IA)
INSERT INTO formation_animateur (formation_id, enseignant_id)
SELECT f.id_formation, 'ENS011'
FROM formations f WHERE f.titre_formation = 'Data Engineering & Big Data : fondations'
AND NOT EXISTS (
    SELECT 1 FROM formation_animateur fa
    WHERE fa.formation_id = f.id_formation AND fa.enseignant_id = 'ENS011'
);
