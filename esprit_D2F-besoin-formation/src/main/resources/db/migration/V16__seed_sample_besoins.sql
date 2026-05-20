-- V16__seed_sample_besoins.sql
-- Données d'exemple : besoins de formation couvrant les 3 statuts d'approbation
-- Idempotent : WHERE NOT EXISTS sur (username, theme)

-- ── BF1 — Approuvé (déclenché la Formation 1) ─────────────────────────────────
INSERT INTO besoin_formation (
    username, type_besoin, titre, theme,
    objectif_formation, objectifs_operationnels, objectifs_pedagogiques,
    methodes_pedagogiques, moyens_pedagogiques, methodes_evaluation_acquis,
    profil_formateur, proposition_animateur,
    public_cible, nb_max_participants,
    programme_formation, duree_formation,
    up, departement, priorite, impact_strategique,
    est_ouverte, autres_informations,
    period_code,
    approuve_cup, approuve_chef_dep, approuve_admin,
    event_published
)
SELECT
    'ktrabelsi',
    'INTERNE',
    'Maîtrise de Spring Boot 3 et JPA pour les enseignants',
    'Spring Boot 3 & JPA Avancé',
    'Permettre aux enseignants d''Informatique de maîtriser Spring Boot 3 pour moderniser leurs cours de développement backend',
    'Concevoir et déployer une application Spring Boot complète avec Spring Security et JPA',
    'Implémenter une API REST sécurisée avec gestion des rôles et migrations Flyway',
    'Alternance cours magistraux (30%) et travaux pratiques (70%) en binôme',
    'Salle informatique, accès GitHub, environnement Docker local',
    'Projet pratique noté + QCM de validation finale',
    'Expert Spring Boot avec expérience en formation professionnelle',
    'Jean DUPONT (formateur externe certifié Spring)',
    'Enseignants du département Informatique (grade assistant et au-dessus)',
    12,
    'S1 : Fondamentaux Spring Boot 3
S2 : JPA/Hibernate avancé (relations, JPQL, performances)
S3 : Spring Security & JWT
S4 : Docker, tests et déploiement CI/CD',
    30,
    'UP_INFO', 'DEPT_INFO',
    'HAUTE',
    'Mise à niveau des compétences enseignantes sur les technologies utilisées dans les projets étudiants PFE 2025-2026',
    false,
    'Priorité haute car plusieurs PFE utilisent Spring Boot 3 cette année',
    '2025-2026-S2',
    true, true, true,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM besoin_formation WHERE username = 'ktrabelsi' AND theme = 'Spring Boot 3 & JPA Avancé'
);

-- ── BF2 — En cours d'approbation (CUP validé, admin en attente) ───────────────
INSERT INTO besoin_formation (
    username, type_besoin, titre, theme,
    objectif_formation, objectifs_operationnels, objectifs_pedagogiques,
    methodes_pedagogiques, moyens_pedagogiques, methodes_evaluation_acquis,
    profil_formateur,
    public_cible, nb_max_participants,
    programme_formation, duree_formation,
    up, departement, priorite, impact_strategique,
    est_ouverte, autres_informations,
    period_code,
    approuve_cup, approuve_chef_dep, approuve_admin,
    event_published
)
SELECT
    'agharbi',
    'INTERNE',
    'Cybersécurité Avancée : OWASP et Pentesting',
    'Cybersécurité Web OWASP',
    'Doter les enseignants des compétences nécessaires pour enseigner la cybersécurité et sensibiliser les étudiants aux bonnes pratiques',
    'Maîtriser les techniques d''attaque et de défense OWASP Top 10 sur des environnements contrôlés',
    'Analyser et corriger des vulnérabilités web réelles à l''aide d''outils professionnels',
    'Ateliers pratiques sur machines virtuelles dédiées (DVWA, WebGoat), challenges CTF internes',
    'Labo sécurité dédié avec machines virtuelles, accès Burp Suite Community',
    'Rapport de pentest sur application cible + présentation des résultats',
    'Expert en sécurité offensive avec certification CEH ou OSCP',
    'Enseignants des départements Réseaux et Informatique',
    15,
    'Module 1 : OWASP Top 10 en détail (injections, XSS, CSRF, IDOR)
Module 2 : Outils de test (Burp Suite, OWASP ZAP, Nikto)
Module 3 : Authentification sécurisée (OAuth2, MFA, JWT)
Module 4 : Rapport de pentest professionnel',
    24,
    'UP_RT', 'DEPT_RT',
    'MOYENNE',
    'Renforcement de l''offre de cours en cybersécurité face à la demande croissante du marché de l''emploi tunisien',
    true,
    'Formation déjà en cours — inscriptions ouvertes depuis le 01/04/2026',
    '2025-2026-S2',
    true, true, false,
    false
WHERE NOT EXISTS (
    SELECT 1 FROM besoin_formation WHERE username = 'agharbi' AND theme = 'Cybersécurité Web OWASP'
);

-- ── BF3 — Nouveau, non encore approuvé ────────────────────────────────────────
INSERT INTO besoin_formation (
    username, type_besoin, titre, theme,
    objectif_formation, objectifs_operationnels, objectifs_pedagogiques,
    methodes_pedagogiques, moyens_pedagogiques, methodes_evaluation_acquis,
    profil_formateur, proposition_animateur,
    public_cible, nb_max_participants,
    programme_formation, duree_formation,
    up, departement, priorite, impact_strategique,
    est_ouverte, autres_informations,
    period_code,
    approuve_cup, approuve_chef_dep, approuve_admin,
    event_published
)
SELECT
    'smansouri',
    'EXTERNE',
    'Deep Learning et PyTorch pour l''enseignement de l''IA',
    'Deep Learning avec PyTorch',
    'Intégrer les techniques de Deep Learning dans les cours de licence et master Informatique',
    'Concevoir et entraîner des réseaux de neurones profonds pour des problèmes de classification et de détection',
    'Implémenter des architectures CNN et Transformer avec PyTorch sur des jeux de données académiques',
    'Formation en présentiel avec sessions de coding intensif, revues de code en groupe',
    'GPUs disponibles via Google Colab Pro, supports de cours numériques, accès Kaggle',
    'Mini-projet de Deep Learning complet (pipeline données → modèle → évaluation → déploiement)',
    'Doctorant ou enseignant-chercheur spécialisé en Deep Learning, publications récentes appréciées',
    'Sophie MARTIN (AI Training Institute, Paris)',
    'Enseignants intéressés par l''enseignement de l''IA, niveau Python intermédiaire requis',
    10,
    'Jour 1 : Fondamentaux PyTorch (tenseurs, autograd, DataLoaders)
Jour 2 : Architectures CNN pour la vision par ordinateur
Jour 3 : Transfer Learning et Fine-tuning (ResNet, VGG)
Jour 4 : Introduction aux Transformers (ViT, BERT léger)
Jour 5 : Déploiement de modèles (ONNX, FastAPI)',
    20,
    'UP_GL', 'DEPT_GL',
    'BASSE',
    'Positionnement d''ESPRIT comme école proposant un enseignement à la pointe de l''IA — différenciation concurrentielle',
    false,
    'Formation externe : budget à valider par la direction. Coût estimé : 1500 DT par participant.',
    '2026-2027-S1',
    false, false, false,
    false
WHERE NOT EXISTS (
    SELECT 1 FROM besoin_formation WHERE username = 'smansouri' AND theme = 'Deep Learning avec PyTorch'
);

-- ── BF4 — Rejeté (refus admin) ────────────────────────────────────────────────
INSERT INTO besoin_formation (
    username, type_besoin, titre, theme,
    objectif_formation,
    public_cible, nb_max_participants,
    duree_formation,
    up, departement, priorite,
    est_ouverte,
    period_code,
    approuve_cup, approuve_chef_dep, approuve_admin,
    notification_message,
    event_published
)
SELECT
    'mhamdi',
    'EXTERNE',
    'Formation PMP — Gestion de Projet',
    'Certification PMP',
    'Préparer les enseignants à la certification PMP pour renforcer les compétences en gestion de projets étudiants',
    'Enseignants encadrant des projets (PFE, PFA)',
    6,
    40,
    'UP_GC', 'DEPT_GC',
    'BASSE',
    false,
    '2025-2026-S2',
    true, false, false,
    'Demande rejetée : budget formation externe épuisé pour cet exercice. À reconduire en 2026-2027.',
    false
WHERE NOT EXISTS (
    SELECT 1 FROM besoin_formation WHERE username = 'mhamdi' AND theme = 'Certification PMP'
);
