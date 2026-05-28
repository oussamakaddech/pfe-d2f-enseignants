-- V16__seed_sample_data.sql
-- Données d'exemple : enseignants, formations, séances, inscriptions, présences
-- Idempotent : ON CONFLICT DO NOTHING sur toutes les tables

-- ── Enseignants ───────────────────────────────────────────────────────────────
-- type : P=Permanent, V=Vacataire
-- etat : A=Actif, I=Inactif
-- cup, chefdepartement : O=Oui, N=Non

INSERT INTO enseignants (id, nom, prenom, mail, type, etat, cup, chefdepartement, up_id, dept_id) VALUES
    ('ENS001', 'TRABELSI',  'Karim',  'k.trabelsi@esprit.tn',          'P', 'A', 'N', 'N', 'UP_INFO', 'DEPT_INFO'),
    ('ENS002', 'MANSOURI',  'Sonia',  's.mansouri@esprit.tn',          'P', 'A', 'N', 'N', 'UP_GL',   'DEPT_GL'),
    ('ENS003', 'GHARBI',    'Amine',  'a.gharbi@esprit.tn',            'P', 'A', 'N', 'N', 'UP_RT',   'DEPT_RT'),
    ('ENS004', 'HAMDI',     'Mourad', 'm.hamdi@esprit.tn',             'P', 'A', 'N', 'O', 'UP_GC',   'DEPT_GC'),
    ('ENS005', 'BEN SALEM', 'Leila',  'l.bensalem@esprit.tn',         'P', 'A', 'O', 'N', 'UP_INFO', 'DEPT_INFO'),
    ('FORM001','DUPONT',    'Jean',   'j.dupont@formation-pro.tn',     'V', 'A', 'N', 'N', NULL,      NULL)
ON CONFLICT (id) DO NOTHING;

-- ── Formations ────────────────────────────────────────────────────────────────
-- Formation 1 — TERMINEE (passée, liée à BF id=1)
INSERT INTO formations (
    id_besoin_formation, type_besoin, titre_formation, domaine, competance,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    1, 'INTERNE',
    'Atelier Spring Boot 3 & JPA Avancé',
    'Développement Logiciel',
    'Spring Boot, Hibernate, REST APIs',
    'Enseignants du département Informatique',
    'Maîtriser Spring Boot 3, JPA/Hibernate et la conception d''APIs REST sécurisées',
    'À l''issue de la formation, les participants seront capables de concevoir et déployer une application Spring Boot complète',
    'QCM final + projet pratique noté',
    'INTERNE', '2026-01-15', '2026-02-28', 'TERMINEE',
    0.0, 30, true,
    'UP_INFO', 'DEPT_INFO', false, false, '2025-2026-S2'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Atelier Spring Boot 3 & JPA Avancé');

-- Formation 2 — EN_COURS
INSERT INTO formations (
    type_besoin, titre_formation, domaine, competance,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Sécurité Web et OWASP Top 10',
    'Réseaux et Cybersécurité',
    'Sécurité applicative, OWASP, Pentesting',
    'Enseignants des départements Réseaux et Informatique',
    'Comprendre et contrer les vulnérabilités web les plus critiques selon OWASP',
    'Identifier, exploiter et corriger les vulnérabilités OWASP Top 10 sur des environnements de lab',
    'Atelier pratique sur environnement de test + rapport de vulnérabilités',
    'INTERNE', '2026-04-01', '2026-06-30', 'EN_COURS',
    0.0, 24, false,
    'UP_RT', 'DEPT_RT', true, true, '2025-2026-S2'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Sécurité Web et OWASP Top 10');

-- Formation 3 — PLANIFIEE
INSERT INTO formations (
    type_besoin, titre_formation, domaine, competance,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation,
    externe_formateur_nom, externe_formateur_prenom, externe_formateur_email,
    organisme_ref_externe,
    date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'EXTERNE',
    'Introduction au Machine Learning avec Python',
    'Intelligence Artificielle',
    'Python, Scikit-learn, Deep Learning',
    'Tous les enseignants souhaitant intégrer l''IA dans leur enseignement',
    'Acquérir les bases du Machine Learning et savoir entraîner des modèles supervisés',
    'Implémenter des algorithmes ML classiques et évaluer leurs performances sur des jeux de données réels',
    'Mini-projet de classification ou de régression avec rapport',
    'EXTERNE',
    'MARTIN', 'Sophie', 's.martin@aitraining.fr',
    'AI Training Institute',
    '2026-09-15', '2026-10-31', 'PLANIFIEE',
    1500.0, 20, false,
    'UP_GL', 'DEPT_GL', false, false, '2026-2027-S1'
WHERE NOT EXISTS (SELECT 1 FROM formations WHERE titre_formation = 'Introduction au Machine Learning avec Python');

-- ── Séances — Formation 1 (TERMINEE) ─────────────────────────────────────────
INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id
)
SELECT '2026-01-15', '09:00', '12:00', 'PRESENTIEL',
       'Introduction à Spring Boot 3 : auto-configuration, starters, profils',
       'Cours magistral + démo live',
       1.5, 1.5, 'Salle B201',
       f.id_formation
FROM formations f WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-01-15'
);

INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id
)
SELECT '2026-01-22', '09:00', '12:00', 'PRESENTIEL',
       'JPA & Hibernate : entités, relations, requêtes JPQL',
       'TP guidé en binôme',
       1.0, 2.0, 'Salle B201',
       f.id_formation
FROM formations f WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-01-22'
);

INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id
)
SELECT '2026-02-05', '09:00', '12:00', 'PRESENTIEL',
       'APIs REST sécurisées : JWT, Spring Security, tests d''intégration',
       'Atelier pratique + revue de code',
       0.5, 2.5, 'Salle B201',
       f.id_formation
FROM formations f WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-02-05'
);

INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id
)
SELECT '2026-02-19', '09:00', '12:00', 'PRESENTIEL',
       'Docker & déploiement : Dockerfile, docker-compose, CI/CD basique',
       'TP déploiement complet d''une application Spring Boot',
       1.0, 2.0, 'Labo Réseaux A105',
       f.id_formation
FROM formations f WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-02-19'
);

-- ── Séances — Formation 2 (EN_COURS) ─────────────────────────────────────────
INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id
)
SELECT '2026-04-10', '14:00', '17:00', 'PRESENTIEL',
       'OWASP Top 10 : présentation des 10 vulnérabilités critiques',
       'Cours + démonstrations d''exploitations réelles',
       2.0, 1.0, 'Amphi 3',
       f.id_formation
FROM formations f WHERE f.titre_formation = 'Sécurité Web et OWASP Top 10'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-04-10'
);

INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id
)
SELECT '2026-04-24', '14:00', '17:00', 'HYBRIDE',
       'Injection SQL & XSS : exploitation et contre-mesures',
       'Lab pratique sur DVWA (Damn Vulnerable Web Application)',
       0.5, 2.5, 'Labo Sécurité A110',
       f.id_formation
FROM formations f WHERE f.titre_formation = 'Sécurité Web et OWASP Top 10'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-04-24'
);

INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id
)
SELECT '2026-05-15', '14:00', '17:00', 'DISTANCIEL',
       'Authentification sécurisée : OAuth2, JWT, MFA',
       'Atelier en ligne + challenges CTF',
       1.0, 2.0, 'Teams',
       f.id_formation
FROM formations f WHERE f.titre_formation = 'Sécurité Web et OWASP Top 10'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-05-15'
);

-- ── Séances — Formation 3 (PLANIFIEE) ────────────────────────────────────────
INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id
)
SELECT '2026-09-15', '09:00', '12:00', 'PRESENTIEL',
       'Python pour le ML : NumPy, Pandas, Matplotlib',
       'TP Jupyter Notebook',
       1.0, 2.0, 'Salle Informatique C301',
       f.id_formation
FROM formations f WHERE f.titre_formation = 'Introduction au Machine Learning avec Python'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-09-15'
);

INSERT INTO seances (
    date_seance, heure_debut, heure_fin, type_seance, contenus, methodes,
    duree_theorique, duree_pratique, salle, formation_id
)
SELECT '2026-09-29', '09:00', '12:00', 'PRESENTIEL',
       'Algorithmes supervisés : régression, classification, arbres de décision',
       'Mise en pratique avec scikit-learn',
       1.5, 1.5, 'Salle Informatique C301',
       f.id_formation
FROM formations f WHERE f.titre_formation = 'Introduction au Machine Learning avec Python'
AND NOT EXISTS (
    SELECT 1 FROM seances s WHERE s.formation_id = f.id_formation AND s.date_seance = '2026-09-29'
);

-- ── Inscriptions ──────────────────────────────────────────────────────────────
-- Formation 1 (TERMINEE)
INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS001', 'APPROVED', '2025-12-10 10:00:00+01'
FROM formations f WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS001'
);
INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS002', 'APPROVED', '2025-12-11 09:30:00+01'
FROM formations f WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS002'
);
INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS003', 'APPROVED', '2025-12-12 14:15:00+01'
FROM formations f WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS003'
);
INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS005', 'REJECTED', '2025-12-20 11:00:00+01'
FROM formations f WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS005'
);

-- Formation 2 (EN_COURS)
INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS002', 'APPROVED', '2026-03-01 10:00:00+01'
FROM formations f WHERE f.titre_formation = 'Sécurité Web et OWASP Top 10'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS002'
);
INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS003', 'APPROVED', '2026-03-02 09:00:00+01'
FROM formations f WHERE f.titre_formation = 'Sécurité Web et OWASP Top 10'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS003'
);
INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS004', 'APPROVED', '2026-03-05 16:00:00+01'
FROM formations f WHERE f.titre_formation = 'Sécurité Web et OWASP Top 10'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS004'
);

-- Formation 3 (PLANIFIEE)
INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS001', 'PENDING', '2026-05-10 10:00:00+02'
FROM formations f WHERE f.titre_formation = 'Introduction au Machine Learning avec Python'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS001'
);
INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS002', 'PENDING', '2026-05-11 09:00:00+02'
FROM formations f WHERE f.titre_formation = 'Introduction au Machine Learning avec Python'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS002'
);
INSERT INTO inscriptions (formation_id, enseignant_id, etat, date_demande)
SELECT f.id_formation, 'ENS005', 'PENDING', '2026-05-12 11:30:00+02'
FROM formations f WHERE f.titre_formation = 'Introduction au Machine Learning avec Python'
AND NOT EXISTS (
    SELECT 1 FROM inscriptions i WHERE i.formation_id = f.id_formation AND i.enseignant_id = 'ENS005'
);

-- ── Présences — séances terminées de Formation 1 ──────────────────────────────
-- Séance 15 Jan — ENS001 présent, ENS002 présent, ENS003 présent
INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT true, NULL, s.id_seance, 'ENS001'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé' AND s.date_seance = '2026-01-15'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS001');

INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT true, NULL, s.id_seance, 'ENS002'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé' AND s.date_seance = '2026-01-15'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS002');

INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT true, NULL, s.id_seance, 'ENS003'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé' AND s.date_seance = '2026-01-15'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS003');

-- Séance 22 Jan — ENS001 présent, ENS002 absent, ENS003 présent
INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT true, NULL, s.id_seance, 'ENS001'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé' AND s.date_seance = '2026-01-22'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS001');

INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT false, 'Absence justifiée', s.id_seance, 'ENS002'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé' AND s.date_seance = '2026-01-22'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS002');

INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT true, NULL, s.id_seance, 'ENS003'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé' AND s.date_seance = '2026-01-22'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS003');

-- Séance 05 Fév — ENS001 présent, ENS002 présent, ENS003 absent
INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT true, NULL, s.id_seance, 'ENS001'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé' AND s.date_seance = '2026-02-05'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS001');

INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT true, NULL, s.id_seance, 'ENS002'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé' AND s.date_seance = '2026-02-05'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS002');

INSERT INTO presences (presence, commentaire, seance_id, enseignant_id)
SELECT false, 'Absence non justifiée', s.id_seance, 'ENS003'
FROM seances s JOIN formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé' AND s.date_seance = '2026-02-05'
AND NOT EXISTS (SELECT 1 FROM presences p WHERE p.seance_id = s.id_seance AND p.enseignant_id = 'ENS003');

-- ── Animateurs ────────────────────────────────────────────────────────────────
INSERT INTO formation_animateur (formation_id, enseignant_id)
SELECT f.id_formation, 'FORM001'
FROM formations f WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA Avancé'
AND NOT EXISTS (
    SELECT 1 FROM formation_animateur fa
    WHERE fa.formation_id = f.id_formation AND fa.enseignant_id = 'FORM001'
);

INSERT INTO formation_animateur (formation_id, enseignant_id)
SELECT f.id_formation, 'ENS003'
FROM formations f WHERE f.titre_formation = 'Sécurité Web et OWASP Top 10'
AND NOT EXISTS (
    SELECT 1 FROM formation_animateur fa
    WHERE fa.formation_id = f.id_formation AND fa.enseignant_id = 'ENS003'
);
