-- ============================================================================
-- Script d'insertion de données de test pour besoin_formation
-- Crée 20 besoins de formation réalistes avec diverses priorités, types et
-- statuts d'approbation pour tester la page BesoinList
-- ============================================================================

-- Insertion de 20 besoins de formation avec variété de priorités, types et UPs
INSERT INTO besoin_formation (
    username, type_besoin, objectif_formation, proposition_animateur, prerequis, 
    public_cible, nb_max_participants, programme_formation, duree_formation,
    titre, theme, objectifs_operationnels, objectifs_pedagogiques, 
    methodes_pedagogiques, moyens_pedagogiques, methodes_evaluation_acquis,
    profil_formateur, horaire_souhaite, up, departement, 
    approuvecup, approuve_chef_dep, approuve_admin, 
    event_published, priorite, impact_strategique
) VALUES
-- 1. Formation individuelle - Priorité HAUTE - Approuvée par tous
('enseignant1', 0, 'Maîtriser les frameworks React avancés', 'Dr. Ahmed Ben Ali', 
 'Connaissances base React', '30 développeurs', 30, 'React Hooks, Context API, Redux',
 40, 'Formation React Avancée', 'Technologies Web', 
 'Implémenter des patterns React avancés', 'Comprendre les hooks et Context API',
 'Travaux pratiques interactifs', 'Ordinateurs, IDE VS Code', 'Projet final évalué',
 'Ingénieur logiciel senior', 'Lundi-Mercredi 14h-16h', '2', '2',
 true, true, true, false, 'HAUTE', 'Essentiel pour moderniser stack front-end'),

-- 2. Formation collective - Priorité CRITIQUE - En attente d''approbation CUP
('enseignant2', 1, 'Intégration continue avec GitLab CI/CD', 'Mme Fatima Khaled',
 'Expérience Git', '50 développeurs', 50, 'GitLab CI/CD, Docker, Kubernetes',
 32, 'Formation CI/CD Moderne', 'DevOps', 
 'Mettre en place pipelines CI/CD automatisées', 'Déployer en production en toute sécurité',
 'Démonstrations live + Labs', 'Serveurs de test, registre Docker', 'Exercices pratiques',
 'DevOps Engineer', 'Mardi-Jeudi 10h-12h', '1', '1',
 true, false, false, false, 'CRITIQUE', 'Bloquant pour accélérer livraisons'),

-- 3. Animation de formation - Priorité MOYENNE - Approuvée CUP uniquement
('enseignant3', 2, 'Animer formation sur microservices', 'Mr Hassan Mami',
 'Base Spring Boot', '40 participants', 40, 'Architecture microservices, Spring Cloud',
 28, 'Animation Microservices', 'Architecture', 
 'Comprendre et implémenter microservices', 'Concevoir architecture scalable',
 'Présentation + ateliers', 'Tableau blanc, code samples', 'Quiz + Projets',
 'Architect Senior', 'Vendredi 9h-12h', '3', '3',
 true, false, false, false, 'MOYENNE', 'Compétence clé requise dans équipes'),

-- 4. Formation INDIVIDUELLE - Priorité BASSE - Pas encore approuvée
('enseignant4', 0, 'Certification AWS Cloud', 'Dr. Mohamed Saad',
 'Fondamentaux cloud', '20 participants', 20, 'AWS EC2, S3, Lambda, RDS',
 24, 'Certification AWS Solutions Architect', 'Cloud', 
 'Obtenir certification AWS', 'Déployer applications sur AWS',
 'Cours en ligne + Hands-on labs', 'Compte AWS de test', 'Examen blanc',
 'Cloud Architect', 'À convenir', '4', '4',
 false, false, false, false, 'BASSE', 'Souhaité mais non urgent'),

-- 5. Formation COLLECTIVE - Priorité HAUTE - Approuvée par CUP et Chef Dép
('enseignant5', 1, 'Sécurité des applications web', 'Mme Leila Zahra',
 'HTML, CSS, JavaScript', '35 développeurs', 35, 'OWASP Top 10, XSS, CSRF, SQL Injection',
 36, 'Sécurité Web Offensive & Defensive', 'Sécurité', 
 'Identifier et corriger vulnérabilités', 'Appliquer bonnes pratiques sécurité',
 'Démonstrations + Penetration testing', 'DVWA, Burp Suite', 'Tests de sécurité réels',
 'Security Expert', 'Lundi-Mercredi 15h-17h', '2', '2',
 true, true, false, false, 'HAUTE', 'Critique pour conformité'),

-- 6. Formation INDIVIDUELLE - Priorité CRITIQUE - Entièrement approuvée
('enseignant6', 0, 'Leadership et gestion d''équipe', 'Mr Jaouad Belhaj',
 'Expérience travail', '25 cadres', 25, 'Styles leadership, communication, motivation',
 20, 'Formation Leaders & Managers', 'RH', 
 'Améliorer leadership et gestion équipe', 'Développer soft skills',
 'Ateliers interactifs + Coaching', 'Vidéos inspirantes, cases studies', 'Auto-évaluation + Feedback',
 'Executive Coach', 'Samedi 9h-13h', '1', '1',
 true, true, true, false, 'CRITIQUE', 'Urgence: succession prévue'),

-- 7. Animation - Priorité MOYENNE - Approuvée Admin
('enseignant7', 2, 'Animer atelier Design Patterns', 'Dr. Salim Kechrid',
 'OOP, Java/C++', '30 développeurs', 30, 'Singleton, Factory, Strategy, Observer',
 16, 'Design Patterns & Best Practices', 'Architecture', 
 'Reconnaître et utiliser patterns', 'Code maintenable et réutilisable',
 'Codes live + Discussions', 'Whiteboard, exemples code', 'Implémentation patterns',
 'Software Architect', 'Jeudi 14h-16h', '3', '3',
 false, false, true, false, 'MOYENNE', 'Support technique effectif'),

-- 8. Formation COLLECTIVE - Priorité BASSE - Partiellement approuvée
('enseignant8', 1, 'Introduction à l''Intelligence Artificielle', 'Mme Saida Benali',
 'Mathématiques, Python', '40 développeurs', 40, 'ML, NLP, Computer Vision basics',
 40, 'Formation IA & Machine Learning', 'Innovation', 
 'Comprendre concepts IA', 'Appliquer ML dans projets',
 'Théorie + Labs Python', 'Jupyter, Scikit-learn, TensorFlow', 'Projets miniatures',
 'Data Scientist', 'Mardi 16h-18h', '4', '4',
 true, false, false, false, 'BASSE', 'Intérêt croissant mais ressources limitées'),

-- 9. Formation INDIVIDUELLE - Priorité HAUTE - Approuvée CUP & Chef Dép
('enseignant9', 0, 'Gestion de projet Agile/Scrum', 'Mr Ibrahim Benatiya',
 'Expérience projets', '28 chefs projets', 28, 'Scrum framework, Kanban, Ceremonies',
 24, 'Certification Scrum Master', 'Gestion Projet', 
 'Maîtriser méthodologie Scrum', 'Animer sprints efficaces',
 'Workshops + Simulations', 'Jira, Trello, tableaux', 'Étude cas + Certification',
 'Agile Coach', 'Mercredi-Vendredi 9h-11h', '2', '2',
 true, true, false, false, 'HAUTE', 'Transforme processus livraisons'),

-- 10. Formation COLLECTIVE - Priorité CRITIQUE - En attente approbations
('enseignant10', 1, 'Base de données NoSQL - MongoDB', 'Dr. Nabil Mansour',
 'SQL basics', '35 développeurs', 35, 'MongoDB, Aggregation, Indexing',
 32, 'Formation MongoDB & NoSQL', 'Données', 
 'Implémenter solutions NoSQL', 'Architecturer données NoSQL',
 'Demos + Hands-on labs', 'MongoDB Atlas, MongoDB Compass', 'Projets pratiques',
 'DB Architect', 'Lundi-Jeudi 10h-12h', '1', '1',
 false, false, false, false, 'CRITIQUE', 'Compétence manquante urgente'),

-- 11. Animation - Priorité MOYENNE - Entièrement approuvée
('enseignant11', 2, 'Animer révisions examen', 'Mme Hana Tatar',
 'Tous les prérequis', '45 étudiants', 45, 'Révision systématique matière',
 12, 'Session Révision Intensive', 'Éducation', 
 'Consolider connaissances', 'Préparer examen final',
 'QA sessions, mock exams', 'Slides, exercices', 'Mock exam + Correction',
 'Enseignant expérimenté', 'Dimanche 14h-17h', '3', '3',
 true, true, true, false, 'MOYENNE', 'Support étudiant essential'),

-- 12. Formation INDIVIDUELLE - Priorité BASSE - Aucune approbation
('enseignant12', 0, 'Maîtriser Git & GitHub', 'Mr Ramzi Bedoui',
 'Ligne de commande', '25 développeurs', 25, 'Git basics, branching, merging, rebase',
 20, 'Git Mastery Workshop', 'Outils', 
 'Workflow Git professionnel', 'Collaboration efficace GitHub',
 'Démonstrations + Exercices', 'Terminal, GitHub', 'Pull requests évaluées',
 'DevOps Specialist', 'Jeudi 15h-17h', '2', '2',
 false, false, false, false, 'BASSE', 'Formation basique utile'),

-- 13. Formation COLLECTIVE - Priorité HAUTE - Approuvée tous
('enseignant13', 1, 'Compliance & RGPD pour développeurs', 'Mme Aida Cherif',
 'Développement général', '50 employés', 50, 'Lois données, RGPD, CCPA, conservation',
 16, 'Formation Compliance & RGPD', 'Légal & Sécurité', 
 'Connaître obligations légales', 'Développer conformément RGPD',
 'Présentations + Q&A', 'Docs légales, templates', 'Quiz de conformité',
 'Legal Tech Expert', 'Vendredi 14h-15h', '1', '1',
 true, true, true, false, 'HAUTE', 'Obligation légale'),

-- 14. Formation INDIVIDUELLE - Priorité MOYENNE - En approbation
('enseignant14', 0, 'Performance web & Optimization', 'Dr. Karim Slimi',
 'Development Web', '22 développeurs', 22, 'Lighthouse, Profiling, Code splitting',
 28, 'Web Performance Optimization', 'Performance', 
 'Optimiser applications web', 'Réduire temps chargement',
 'Analyse live + Refactoring', 'Chrome DevTools, Lighthouse', 'Audit performance',
 'Performance Expert', 'Mardi-Jeudi 16h-18h', '4', '4',
 true, true, false, false, 'MOYENNE', 'Améliore UX significativement'),

-- 15. Animation - Priorité CRITIQUE - Approuvée CUP & Admin
('enseignant15', 2, 'Animer débat technique architecture', 'Mr Youssef Ayed',
 'Expérience architecture', '40 architectes', 40, 'Débat architecture moderne, trade-offs',
 8, 'Tech Forum - Architecture Debate', 'Discussions', 
 'Aligner architecture équipes', 'Prendre decisions architecturales',
 'Débat structuré + Votes', 'Slides comparatifs', 'Consensus group',
 'Chief Architect', 'Mercredi 17h-18h', '2', '2',
 true, false, true, false, 'CRITIQUE', 'Alignement urgent requis'),

-- 16. Formation COLLECTIVE - Priorité BASSE - Partiellement approuvée
('enseignant16', 1, 'Documentation technique efficace', 'Mme Nissrine Said',
 'Rédaction technique', '30 développeurs', 30, 'Markdown, Confluence, WritetheDocs',
 12, 'Formation Documentation Technique', 'Qualité', 
 'Rédiger docs maintenables', 'Cultiver culture documentation',
 'Ateliers écriture', 'Templates, outils', 'Docs réelles évaluées',
 'Tech Writer', 'Lundi 14h-15h30', '3', '3',
 false, true, false, false, 'BASSE', 'Améliore qualité code'),

-- 17. Formation INDIVIDUELLE - Priorité HAUTE - Pas approuvée encore
('enseignant17', 0, 'Entretiens techniques & Hiring', 'Dr. Slaheddine Rebai',
 'Expérience recrutement', '15 interviewers', 15, 'Évaluation candidates, questions, scoring',
 16, 'Formation Interview Techniques', 'Recrutement', 
 'Évaluer candidats objectivement', 'Standardiser processus recrutement',
 'Role-playing + Feedback', 'Cases études', 'Interviews évaluées',
 'Hiring Manager', 'Samedi 10h-12h', '1', '1',
 false, false, false, false, 'HAUTE', 'Qualité recrutement critique'),

-- 18. Formation COLLECTIVE - Priorité MOYENNE - Entièrement approuvée
('enseignant18', 1, 'Communication interpersonnelle', 'Mme Rana Hmaidi',
 'Aucun', '35 employés', 35, 'Écoute active, feedback, résolution conflits',
 20, 'Formation Soft Skills Communication', 'Ressources Humaines', 
 'Améliorer communication équipe', 'Réduire conflits',
 'Jeux de rôle + Discussions', 'Vidéos communication', 'Feedback 360',
 'HR Coach', 'Mardi-Jeudi 13h-14h30', '4', '4',
 true, true, true, false, 'MOYENNE', 'Renforce cohésion équipe'),

-- 19. Animation - Priorité BASSE - Approuvée CUP seulement
('enseignant19', 2, 'Animer atelier brainstorm innovation', 'Mr Zied Mensi',
 'Pas de prérequis', '50 participants', 50, 'Techniques créativité, ideation, prototyping',
 6, 'Innovation Workshop Session', 'Créativité', 
 'Générer idées nouvelles', 'Protocoter solutions',
 'Techniques créativité structurées', 'Whiteboards, post-its', 'Idées documentées',
 'Innovation Facilitator', 'Vendredi 16h-17h', '3', '3',
 true, false, false, false, 'BASSE', 'Stimule créativité équipes'),

-- 20. Formation INDIVIDUELLE - Priorité CRITIQUE - Approuvée par tous
('enseignant20', 0, 'Gestion crise & Business Continuity', 'Dr. Marwan Zouari',
 'Expérience IT', '20 responsables', 20, 'Plans continuité, RTO/RPO, tests DRP',
 24, 'Formation Business Continuity', 'Risque & Conformité', 
 'Préparer gestion crise', 'Réduire temps indisponibilité',
 'Simulations crise', 'Playbooks, check-lists', 'Exos scénarios réels',
 'CISO/IT Director', 'Jeudi 9h-11h', '2', '2',
 true, true, true, false, 'CRITIQUE', 'Survivabilité entreprise');

-- Affichage de confirmation
SELECT 'Insertion réussie: ' || count(*) || ' besoins de formation créés' as resultat 
FROM besoin_formation;
