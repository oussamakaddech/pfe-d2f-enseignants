-- ============================================================
-- V8 â€” Seed des donnÃ©es rÃ©elles pour le dashboard prÃ©dictif
-- ============================================================
-- DonnÃ©es cohÃ©rentes avec ESPRIT-like engineering school context
-- AlignÃ©es sur les UPs et dÃ©partements du service formation

-- â”€â”€ CompÃ©tences (rÃ©fÃ©rentielles) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Ã‰chelle 0-5 : niveau_actuel / niveau_requis / niveau_vise
INSERT INTO competences (id, code, nom, domaine) VALUES
    (1,  'C1',  'Conception pÃ©dagogique',         'PÃ©dagogie'),
    (2,  'C2',  'DÃ©veloppement Backend',          'GÃ©nie Logiciel'),
    (3,  'C3',  'DÃ©veloppement Frontend',         'GÃ©nie Logiciel'),
    (4,  'C4',  'Architecture logicielle',        'GÃ©nie Logiciel'),
    (5,  'C5',  'Bases de donnÃ©es',               'Informatique'),
    (6,  'C6',  'QualitÃ© & Tests',                'GÃ©nie Logiciel'),
    (7,  'C7',  'SÃ©curitÃ© applicative',           'RÃ©seaux'),
    (8,  'C8',  'RÃ©seaux & SystÃ¨mes',             'RÃ©seaux'),
    (9,  'C9',  'Infrastructure & Cloud',         'RÃ©seaux'),
    (10, 'C10', 'Machine Learning',               'Intelligence Artificielle'),
    (11, 'C11', 'Deep Learning',                  'Intelligence Artificielle'),
    (12, 'C12', 'DevOps',                         'RÃ©seaux')
ON CONFLICT (id) DO NOTHING;-- -- Enseignants (27 au total, cohérents avec formation service) --------------
-- Format: id, up_id, dept_id, nom, prenom, email
-- Chaque enseignant appartient à un seul département et une seule UP

-- Génie Logiciel (5 enseignants)
INSERT INTO enseignants (id, up_id, dept_id, nom, prenom, email) VALUES
    ('ENS001', 'UP_GL',  'DEPT_GL',  'BENSaid',    'Ahmed',   'a.bensaid@esprit.tn'),
    ('ENS002', 'UP_GL',  'DEPT_GL',  'Cherif',     'Fatma',   'f.cherif@esprit.tn'),
    ('ENS003', 'UP_GL',  'DEPT_GL',  'Haddad',     'Karim',   'k.haddad@esprit.tn'),
    ('ENS004', 'UP_GL',  'DEPT_GL',  'Djerba',     'Meriem',  'm.djerba@esprit.tn'),
    ('ENS005', 'UP_GL',  'DEPT_GL',  'Belkacem',   'Samir',   's.belkacem@esprit.tn')
ON CONFLICT (id) DO NOTHING;

-- Informatique (4 enseignants)
INSERT INTO enseignants (id, up_id, dept_id, nom, prenom, email) VALUES
    ('ENS006', 'UP_INFO', 'DEPT_INFO', 'Khemiri',  'Nour',    'n.khemiri@esprit.tn'),
    ('ENS007', 'UP_INFO', 'DEPT_INFO', 'Mansouri', 'Walid',   'w.mansouri@esprit.tn'),
    ('ENS008', 'UP_INFO', 'DEPT_INFO', 'Gharbi',   'Imen',    'i.gharbi@esprit.tn'),
    ('ENS009', 'UP_INFO', 'DEPT_INFO', 'Ali',      'Mohamed', 'm.ali@esprit.tn')
ON CONFLICT (id) DO NOTHING;

-- Réseaux & Télécommunications (4 enseignants)
INSERT INTO enseignants (id, up_id, dept_id, nom, prenom, email) VALUES
    ('ENS010', 'UP_RT',  'DEPT_RT',  'Trabelsi',   'Sihem',   's.trabelsi@esprit.tn'),
    ('ENS011', 'UP_RT',  'DEPT_RT',  'Mejri',      'Anis',    'a.mejri@esprit.tn'),
    ('ENS012', 'UP_RT',  'DEPT_RT',  'BenYoussef', 'Wafa',    'w.benyoussef@esprit.tn'),
    ('ENS013', 'UP_RT',  'DEPT_RT',  'Gharbi',     'Walid',   'w.gharbi@esprit.tn')
ON CONFLICT (id) DO NOTHING;

-- Génie Civil (4 enseignants)
INSERT INTO enseignants (id, up_id, dept_id, nom, prenom, email) VALUES
    ('ENS014', 'UP_GC',  'DEPT_GC',  'Bougherara', 'Karim',   'k.bougherara@esprit.tn'),
    ('ENS015', 'UP_GC',  'DEPT_GC',  'Mroueh',     'Sihem',   's.mroueh@esprit.tn'),
    ('ENS016', 'UP_GC',  'DEPT_GC',  'Salah',      'Mohamed', 'm.salah@esprit.tn'),
    ('ENS017', 'UP_GC',  'DEPT_GC',  'Haddad',     'Amira',   'a.haddad@esprit.tn')
ON CONFLICT (id) DO NOTHING;

-- Développement Web (4 enseignants)
INSERT INTO enseignants (id, up_id, dept_id, nom, prenom, email) VALUES
    ('ENS018', 'UP_WEB', 'DEPT_WEB', 'Mansouri',   'Youssef', 'y.mansouri@esprit.tn'),
    ('ENS019', 'UP_WEB', 'DEPT_WEB', 'Bousso',     'Ghada',   'g.bousso@esprit.tn'),
    ('ENS020', 'UP_WEB', 'DEPT_WEB', 'Djerba',     'Karim',   'k.djerba@esprit.tn'),
    ('ENS021', 'UP_WEB', 'DEPT_WEB', 'Ali',        'Meriem',  'm.ali@esprit.tn')
ON CONFLICT (id) DO NOTHING;

-- Intelligence Artificielle & Data (5 enseignants)
INSERT INTO enseignants (id, up_id, dept_id, nom, prenom, email) VALUES
    ('ENS022', 'UP_IA',  'DEPT_IA',  'Cherif',     'Ahmed',   'a.cherif@esprit.tn'),
    ('ENS023', 'UP_IA',  'DEPT_IA',  'Haddad',     'Fatma',   'f.haddad@esprit.tn'),
    ('ENS024', 'UP_IA',  'DEPT_IA',  'Djerba',     'Karim',   'k.djerba@esprit.tn'),
    ('ENS025', 'UP_IA',  'DEPT_IA',  'Bensaid',    'Samir',   's.bensaid@esprit.tn'),
    ('ENS026', 'UP_IA',  'DEPT_IA',  'Mejri',      'Nour',    'n.mejri@esprit.tn')
ON CONFLICT (id) DO NOTHING;

-- Formateur externe (vacataire, pas de dept/up)
INSERT INTO enseignants (id, up_id, dept_id, nom, prenom, email) VALUES
    ('ENS027', NULL, NULL, 'Salah', 'Mohamed', 'm.salah@esprit.tn')
ON CONFLICT (id) DO NOTHING;
-- -- Skill Gaps (écarts de compétences) ------------------------
-- Format: enseignant_id, competence_id, competence_code, competence_nom,
--         domaine_id, domaine_nom, niveau_actuel, niveau_requis, niveau_vise,
--         gap_score, impact_score, urgence_score, priorite_score,
--         niveau_urgence, mois_stagnation, en_regression

-- ENS001 — Ahmed Bensaid (GL) — Backend, Architecture, Tests
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS001', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 4, 8, 3, 0.50, 0.60, 0.55, 0.58, 'HAUTE', 0, FALSE),
    ('ENS001', 4, 'C4', 'Architecture logicielle', 1, 'Génie Logiciel', 3, 7, 3, 0.57, 0.50, 0.50, 0.52, 'HAUTE', 0, FALSE),
    ('ENS001', 6, 'C6', 'Qualité & Tests', 1, 'Génie Logiciel', 5, 9, 3, 0.44, 0.40, 0.45, 0.43, 'MODEREE', 0, FALSE),
    ('ENS001', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 6, 7, 3, 0.14, 0.30, 0.20, 0.21, 'FAIBLE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS002 — Fatma Cherif (GL) — Architecture, Tests, Backend
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS002', 4, 'C4', 'Architecture logicielle', 1, 'Génie Logiciel', 2, 8, 3, 0.75, 0.70, 0.65, 0.70, 'CRITIQUE', 0, FALSE),
    ('ENS002', 6, 'C6', 'Qualité & Tests', 1, 'Génie Logiciel', 3, 9, 3, 0.67, 0.55, 0.60, 0.61, 'HAUTE', 0, FALSE),
    ('ENS002', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 7, 8, 3, 0.13, 0.40, 0.30, 0.28, 'FAIBLE', 0, FALSE),
    ('ENS002', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 5, 8, 3, 0.38, 0.45, 0.40, 0.41, 'MODEREE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS003 — Karim Haddad (GL) — Tests, Backend, Architecture
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS003', 6, 'C6', 'Qualité & Tests', 1, 'Génie Logiciel', 1, 9, 3, 0.89, 0.80, 0.75, 0.81, 'CRITIQUE', 0, FALSE),
    ('ENS003', 4, 'C4', 'Architecture logicielle', 1, 'Génie Logiciel', 4, 8, 3, 0.50, 0.50, 0.45, 0.48, 'HAUTE', 0, FALSE),
    ('ENS003', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 6, 8, 3, 0.25, 0.35, 0.30, 0.30, 'MODEREE', 0, FALSE),
    ('ENS003', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 5, 7, 3, 0.29, 0.30, 0.25, 0.28, 'FAIBLE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS004 — Meriem Djerba (GL) — Backend, Architecture, Tests
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS004', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 2, 8, 3, 0.75, 0.65, 0.60, 0.67, 'CRITIQUE', 0, FALSE),
    ('ENS004', 4, 'C4', 'Architecture logicielle', 1, 'Génie Logiciel', 3, 7, 3, 0.57, 0.50, 0.45, 0.51, 'HAUTE', 0, FALSE),
    ('ENS004', 6, 'C6', 'Qualité & Tests', 1, 'Génie Logiciel', 4, 9, 3, 0.56, 0.45, 0.50, 0.50, 'HAUTE', 0, FALSE),
    ('ENS004', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 6, 8, 3, 0.25, 0.30, 0.25, 0.27, 'FAIBLE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS005 — Samir Belkacem (GL) — Backend, Frontend, Architecture, Tests
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS005', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 3, 8, 3, 0.63, 0.55, 0.50, 0.56, 'HAUTE', 0, FALSE),
    ('ENS005', 3, 'C3', 'Développement Frontend', 1, 'Génie Logiciel', 2, 8, 3, 0.75, 0.50, 0.45, 0.57, 'CRITIQUE', 0, FALSE),
    ('ENS005', 4, 'C4', 'Architecture logicielle', 1, 'Génie Logiciel', 4, 7, 3, 0.43, 0.40, 0.35, 0.40, 'MODEREE', 0, FALSE),
    ('ENS005', 6, 'C6', 'Qualité & Tests', 1, 'Génie Logiciel', 5, 9, 3, 0.44, 0.40, 0.40, 0.42, 'MODEREE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;
-- ENS006 — Nour Khemiri (INFO) — BDD, Backend, Tests
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS006', 5, 'C5', 'Bases de données', 2, 'Informatique', 2, 9, 3, 0.78, 0.65, 0.60, 0.68, 'CRITIQUE', 0, FALSE),
    ('ENS006', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 4, 8, 3, 0.50, 0.45, 0.40, 0.45, 'HAUTE', 0, FALSE),
    ('ENS006', 6, 'C6', 'Qualité & Tests', 1, 'Génie Logiciel', 3, 8, 3, 0.63, 0.40, 0.35, 0.44, 'HAUTE', 0, FALSE),
    ('ENS006', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 6, 7, 3, 0.14, 0.25, 0.20, 0.20, 'FAIBLE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS007 — Walid Mansouri (INFO) — BDD, Backend, Architecture
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS007', 5, 'C5', 'Bases de données', 2, 'Informatique', 3, 9, 3, 0.67, 0.55, 0.50, 0.57, 'HAUTE', 0, FALSE),
    ('ENS007', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 5, 8, 3, 0.38, 0.40, 0.35, 0.38, 'MODEREE', 0, FALSE),
    ('ENS007', 4, 'C4', 'Architecture logicielle', 1, 'Génie Logiciel', 3, 7, 3, 0.57, 0.45, 0.40, 0.47, 'HAUTE', 0, FALSE),
    ('ENS007', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 7, 8, 3, 0.13, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS008 — Imen Gharbi (INFO) — Backend, BDD, Tests
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS008', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 2, 8, 3, 0.75, 0.60, 0.55, 0.63, 'CRITIQUE', 0, FALSE),
    ('ENS008', 5, 'C5', 'Bases de données', 2, 'Informatique', 4, 9, 3, 0.56, 0.50, 0.45, 0.50, 'HAUTE', 0, FALSE),
    ('ENS008', 6, 'C6', 'Qualité & Tests', 1, 'Génie Logiciel', 3, 8, 3, 0.63, 0.45, 0.40, 0.49, 'HAUTE', 0, FALSE),
    ('ENS008', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 6, 7, 3, 0.14, 0.25, 0.20, 0.20, 'FAIBLE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS009 — Mohamed Ali (INFO) — Backend, BDD, Architecture
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS009', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 3, 8, 3, 0.63, 0.50, 0.45, 0.53, 'HAUTE', 0, FALSE),
    ('ENS009', 5, 'C5', 'Bases de données', 2, 'Informatique', 3, 9, 3, 0.67, 0.55, 0.50, 0.57, 'HAUTE', 0, FALSE),
    ('ENS009', 4, 'C4', 'Architecture logicielle', 1, 'Génie Logiciel', 3, 7, 3, 0.57, 0.45, 0.40, 0.47, 'HAUTE', 0, FALSE),
    ('ENS009', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 7, 8, 3, 0.13, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS010 — Sihem Trabelsi (RT) — Sécurité, Réseaux, Cloud
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS010', 7, 'C7', 'Sécurité applicative', 3, 'Réseaux', 2, 8, 3, 0.75, 0.65, 0.60, 0.67, 'CRITIQUE', 0, FALSE),
    ('ENS010', 8, 'C8', 'Réseaux & Systèmes', 3, 'Réseaux', 4, 9, 3, 0.56, 0.50, 0.45, 0.50, 'HAUTE', 0, FALSE),
    ('ENS010', 9, 'C9', 'Infrastructure & Cloud', 3, 'Réseaux', 3, 8, 3, 0.63, 0.55, 0.50, 0.56, 'HAUTE', 0, FALSE),
    ('ENS010', 12, 'C12', 'DevOps', 3, 'Réseaux', 4, 8, 3, 0.50, 0.45, 0.40, 0.45, 'HAUTE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS011 — Anis Mejri (RT) — Cloud, Réseaux, Sécurité, DevOps
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS011', 9, 'C9', 'Infrastructure & Cloud', 3, 'Réseaux', 1, 9, 3, 0.89, 0.80, 0.75, 0.81, 'CRITIQUE', 0, FALSE),
    ('ENS011', 8, 'C8', 'Réseaux & Systèmes', 3, 'Réseaux', 3, 8, 3, 0.63, 0.60, 0.55, 0.59, 'HAUTE', 0, FALSE),
    ('ENS011', 7, 'C7', 'Sécurité applicative', 3, 'Réseaux', 4, 7, 3, 0.43, 0.50, 0.45, 0.46, 'MODEREE', 0, FALSE),
    ('ENS011', 12, 'C12', 'DevOps', 3, 'Réseaux', 2, 8, 3, 0.75, 0.55, 0.50, 0.57, 'CRITIQUE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;
-- ENS012 — Wafa Ben Youssef (RT) — DevOps, Cloud, Réseaux, Sécurité
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS012', 12, 'C12', 'DevOps', 3, 'Réseaux', 2, 8, 3, 0.75, 0.55, 0.50, 0.57, 'CRITIQUE', 0, FALSE),
    ('ENS012', 9, 'C9', 'Infrastructure & Cloud', 3, 'Réseaux', 3, 9, 3, 0.67, 0.55, 0.50, 0.57, 'HAUTE', 0, FALSE),
    ('ENS012', 8, 'C8', 'Réseaux & Systèmes', 3, 'Réseaux', 4, 8, 3, 0.50, 0.45, 0.40, 0.45, 'HAUTE', 0, FALSE),
    ('ENS012', 7, 'C7', 'Sécurité applicative', 3, 'Réseaux', 3, 7, 3, 0.57, 0.50, 0.45, 0.51, 'HAUTE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS013 — Walid Gharbi (RT) — Réseaux, Cloud, Sécurité, DevOps
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS013', 8, 'C8', 'Réseaux & Systèmes', 3, 'Réseaux', 2, 9, 3, 0.78, 0.60, 0.55, 0.63, 'CRITIQUE', 0, FALSE),
    ('ENS013', 9, 'C9', 'Infrastructure & Cloud', 3, 'Réseaux', 3, 8, 3, 0.63, 0.55, 0.50, 0.56, 'HAUTE', 0, FALSE),
    ('ENS013', 7, 'C7', 'Sécurité applicative', 3, 'Réseaux', 3, 7, 3, 0.57, 0.50, 0.45, 0.51, 'HAUTE', 0, FALSE),
    ('ENS013', 12, 'C12', 'DevOps', 3, 'Réseaux', 4, 8, 3, 0.50, 0.45, 0.40, 0.45, 'HAUTE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS014 — Karim Bougherara (GC) — Pédagogie, Backend, Frontend
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS014', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 5, 8, 3, 0.38, 0.40, 0.35, 0.38, 'MODEREE', 0, FALSE),
    ('ENS014', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE),
    ('ENS014', 3, 'C3', 'Développement Frontend', 1, 'Génie Logiciel', 4, 7, 3, 0.43, 0.35, 0.30, 0.36, 'MODEREE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS015 — Sihem Mroueh (GC) — Pédagogie, Backend, Frontend
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS015', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 6, 8, 3, 0.25, 0.35, 0.30, 0.30, 'MODEREE', 0, FALSE),
    ('ENS015', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 5, 7, 3, 0.29, 0.30, 0.25, 0.28, 'FAIBLE', 0, FALSE),
    ('ENS015', 3, 'C3', 'Développement Frontend', 1, 'Génie Logiciel', 3, 7, 3, 0.57, 0.35, 0.30, 0.37, 'MODEREE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS016 — Mohamed Salah (GC) — Pédagogie, Backend, Frontend
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS016', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 4, 8, 3, 0.50, 0.35, 0.30, 0.38, 'MODEREE', 0, FALSE),
    ('ENS016', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 7, 7, 3, 0.00, 0.25, 0.20, 0.15, 'FAIBLE', 0, FALSE),
    ('ENS016', 3, 'C3', 'Développement Frontend', 1, 'Génie Logiciel', 5, 7, 3, 0.29, 0.30, 0.25, 0.28, 'FAIBLE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS017 — Amira Haddad (GC) — Pédagogie, Backend, Frontend
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS017', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 3, 8, 3, 0.63, 0.40, 0.35, 0.42, 'MODEREE', 0, FALSE),
    ('ENS017', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE),
    ('ENS017', 3, 'C3', 'Développement Frontend', 1, 'Génie Logiciel', 4, 7, 3, 0.43, 0.35, 0.30, 0.36, 'MODEREE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;
-- ENS018 — Youssef Mansouri (WEB) — Frontend, Backend, Pédagogie
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS018', 3, 'C3', 'Développement Frontend', 1, 'Génie Logiciel', 2, 9, 3, 0.78, 0.65, 0.60, 0.68, 'CRITIQUE', 0, FALSE),
    ('ENS018', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 4, 8, 3, 0.50, 0.50, 0.45, 0.47, 'HAUTE', 0, FALSE),
    ('ENS018', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE),
    ('ENS018', 6, 'C6', 'Qualité & Tests', 1, 'Génie Logiciel', 3, 8, 3, 0.63, 0.45, 0.40, 0.49, 'HAUTE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS019 — Ghada Bousso (WEB) — Backend, Frontend, Pédagogie, Tests
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS019', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 3, 8, 3, 0.63, 0.55, 0.50, 0.56, 'HAUTE', 0, FALSE),
    ('ENS019', 3, 'C3', 'Développement Frontend', 1, 'Génie Logiciel', 4, 9, 3, 0.56, 0.50, 0.45, 0.50, 'HAUTE', 0, FALSE),
    ('ENS019', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE),
    ('ENS019', 6, 'C6', 'Qualité & Tests', 1, 'Génie Logiciel', 4, 8, 3, 0.50, 0.45, 0.40, 0.45, 'HAUTE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS020 — Karim Djerba (WEB) — Backend, Frontend, Pédagogie, Tests
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS020', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 2, 8, 3, 0.75, 0.60, 0.55, 0.63, 'CRITIQUE', 0, FALSE),
    ('ENS020', 3, 'C3', 'Développement Frontend', 1, 'Génie Logiciel', 3, 9, 3, 0.67, 0.55, 0.50, 0.57, 'HAUTE', 0, FALSE),
    ('ENS020', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 5, 7, 3, 0.29, 0.30, 0.25, 0.28, 'FAIBLE', 0, FALSE),
    ('ENS020', 6, 'C6', 'Qualité & Tests', 1, 'Génie Logiciel', 4, 8, 3, 0.50, 0.45, 0.40, 0.45, 'HAUTE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS021 — Meriem Ali (WEB) — Frontend, Backend, Pédagogie, Tests
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS021', 3, 'C3', 'Développement Frontend', 1, 'Génie Logiciel', 4, 9, 3, 0.56, 0.50, 0.45, 0.50, 'HAUTE', 0, FALSE),
    ('ENS021', 2, 'C2', 'Développement Backend', 1, 'Génie Logiciel', 5, 8, 3, 0.38, 0.45, 0.40, 0.41, 'MODEREE', 0, FALSE),
    ('ENS021', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE),
    ('ENS021', 6, 'C6', 'Qualité & Tests', 1, 'Génie Logiciel', 3, 8, 3, 0.63, 0.45, 0.40, 0.49, 'HAUTE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS022 — Ahmed Cherif (IA) — ML, Pédagogie, BDD
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS022', 10, 'C10', 'Machine Learning', 4, 'Intelligence Artificielle', 2, 9, 3, 0.78, 0.70, 0.65, 0.71, 'CRITIQUE', 0, FALSE),
    ('ENS022', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE),
    ('ENS022', 5, 'C5', 'Bases de données', 2, 'Informatique', 4, 8, 3, 0.50, 0.45, 0.40, 0.45, 'HAUTE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS023 — Fatma Haddad (IA) — Deep Learning, ML, Pédagogie
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS023', 11, 'C11', 'Deep Learning', 4, 'Intelligence Artificielle', 1, 9, 3, 0.89, 0.85, 0.80, 0.85, 'CRITIQUE', 0, FALSE),
    ('ENS023', 10, 'C10', 'Machine Learning', 4, 'Intelligence Artificielle', 3, 8, 3, 0.63, 0.60, 0.55, 0.59, 'HAUTE', 0, FALSE),
    ('ENS023', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS024 — Karim Djerba (IA) — BDD, ML, Pédagogie
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS024', 5, 'C5', 'Bases de données', 2, 'Informatique', 2, 8, 3, 0.75, 0.55, 0.50, 0.57, 'CRITIQUE', 0, FALSE),
    ('ENS024', 10, 'C10', 'Machine Learning', 4, 'Intelligence Artificielle', 3, 9, 3, 0.67, 0.60, 0.55, 0.61, 'HAUTE', 0, FALSE),
    ('ENS024', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS025 — Samir Bensaid (IA) — ML, Deep Learning, Pédagogie
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS025', 10, 'C10', 'Machine Learning', 4, 'Intelligence Artificielle', 3, 9, 3, 0.67, 0.55, 0.50, 0.57, 'HAUTE', 0, FALSE),
    ('ENS025', 11, 'C11', 'Deep Learning', 4, 'Intelligence Artificielle', 4, 8, 3, 0.50, 0.50, 0.45, 0.47, 'HAUTE', 0, FALSE),
    ('ENS025', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;

-- ENS026 — Nour Mejri (IA) — ML, Deep Learning, Pédagogie
INSERT INTO skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression) VALUES
    ('ENS026', 10, 'C10', 'Machine Learning', 4, 'Intelligence Artificielle', 4, 9, 3, 0.56, 0.50, 0.45, 0.50, 'HAUTE', 0, FALSE),
    ('ENS026', 11, 'C11', 'Deep Learning', 4, 'Intelligence Artificielle', 3, 8, 3, 0.63, 0.55, 0.50, 0.56, 'HAUTE', 0, FALSE),
    ('ENS026', 1, 'C1', 'Conception pédagogique', 0, 'Pédagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE)
ON CONFLICT (enseignant_id, competence_id) DO NOTHING;
-- -- Teacher Risk Profiles (calculés) --------------------------
-- Score de risque normalisé [0,1], niveau de risque, gaps, tendance
-- Facteurs : no_training, stagnation, gap_count, feedback_decline, unmet_needs

INSERT INTO teacher_risk_profiles (enseignant_id, score_risque, niveau_risque, nb_gaps_critiques, nb_gaps_moderes,
    nb_gaps_faibles, nb_mois_stagnation_max, tendance, taux_completion_formations, facteurs_risque) VALUES
    ('ENS001', 0.28, 'MODERE', 0, 2, 2, 0, 'STABLE', 65.0, '{"no_training":0.35,"stagnation":0.0,"gap_count":0.0,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS002', 0.32, 'MODERE', 1, 2, 1, 0, 'STABLE', 60.0, '{"no_training":0.40,"stagnation":0.0,"gap_count":0.25,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS003', 0.42, 'MODERE', 1, 2, 1, 0, 'STABLE', 55.0, '{"no_training":0.45,"stagnation":0.0,"gap_count":0.25,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS004', 0.35, 'MODERE', 1, 2, 1, 0, 'STABLE', 58.0, '{"no_training":0.42,"stagnation":0.0,"gap_count":0.25,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS005', 0.38, 'MODERE', 1, 2, 1, 0, 'STABLE', 52.0, '{"no_training":0.48,"stagnation":0.0,"gap_count":0.25,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS006', 0.33, 'MODERE', 1, 2, 1, 0, 'STABLE', 62.0, '{"no_training":0.38,"stagnation":0.0,"gap_count":0.25,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS007', 0.25, 'MODERE', 0, 3, 1, 0, 'STABLE', 68.0, '{"no_training":0.32,"stagnation":0.0,"gap_count":0.0,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS008', 0.30, 'MODERE', 1, 2, 1, 0, 'STABLE', 57.0, '{"no_training":0.43,"stagnation":0.0,"gap_count":0.25,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS009', 0.25, 'MODERE', 0, 3, 1, 0, 'STABLE', 64.0, '{"no_training":0.36,"stagnation":0.0,"gap_count":0.0,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS010', 0.45, 'MODERE', 1, 3, 0, 0, 'STABLE', 50.0, '{"no_training":0.50,"stagnation":0.0,"gap_count":0.25,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS011', 0.52, 'ELEVE', 2, 2, 0, 0, 'STABLE', 45.0, '{"no_training":0.55,"stagnation":0.0,"gap_count":0.50,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS012', 0.48, 'MODERE', 1, 3, 0, 0, 'STABLE', 48.0, '{"no_training":0.52,"stagnation":0.0,"gap_count":0.25,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS013', 0.40, 'MODERE', 1, 3, 0, 0, 'STABLE', 53.0, '{"no_training":0.47,"stagnation":0.0,"gap_count":0.25,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS014', 0.18, 'FAIBLE', 0, 2, 1, 0, 'STABLE', 72.0, '{"no_training":0.28,"stagnation":0.0,"gap_count":0.0,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS015', 0.20, 'FAIBLE', 0, 2, 1, 0, 'STABLE', 70.0, '{"no_training":0.30,"stagnation":0.0,"gap_count":0.0,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS016', 0.15, 'FAIBLE', 0, 1, 2, 0, 'STABLE', 75.0, '{"no_training":0.25,"stagnation":0.0,"gap_count":0.0,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS017', 0.22, 'FAIBLE', 0, 2, 1, 0, 'STABLE', 68.0, '{"no_training":0.32,"stagnation":0.0,"gap_count":0.0,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS018', 0.35, 'MODERE', 1, 2, 1, 0, 'STABLE', 56.0, '{"no_training":0.44,"stagnation":0.0,"gap_count":0.25,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS019', 0.32, 'MODERE', 1, 2, 1, 0, 'STABLE', 59.0, '{"no_training":0.41,"stagnation":0.0,"gap_count":0.25,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS020', 0.38, 'MODERE', 1, 2, 1, 0, 'STABLE', 54.0, '{"no_training":0.46,"stagnation":0.0,"gap_count":0.25,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS021', 0.28, 'MODERE', 0, 2, 2, 0, 'STABLE', 63.0, '{"no_training":0.37,"stagnation":0.0,"gap_count":0.0,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS022', 0.42, 'MODERE', 1, 1, 1, 0, 'STABLE', 51.0, '{"no_training":0.49,"stagnation":0.0,"gap_count":0.25,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS023', 0.58, 'ELEVE', 2, 1, 0, 0, 'STABLE', 43.0, '{"no_training":0.57,"stagnation":0.0,"gap_count":0.50,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS024', 0.35, 'MODERE', 1, 1, 1, 0, 'STABLE', 55.0, '{"no_training":0.45,"stagnation":0.0,"gap_count":0.25,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS025', 0.30, 'MODERE', 0, 2, 1, 0, 'STABLE', 60.0, '{"no_training":0.40,"stagnation":0.0,"gap_count":0.0,"feedback_decline":0.0,"unmet_needs":0.0}'),
    ('ENS026', 0.25, 'MODERE', 0, 2, 1, 0, 'STABLE', 62.0, '{"no_training":0.38,"stagnation":0.0,"gap_count":0.0,"feedback_decline":0.0,"unmet_needs":0.0}');
-- -- Dashboard Snapshot (KPI globaux) --------------------------
-- KPI calculés à partir des données ci-dessus

INSERT INTO dashboard_snapshots (scope, scope_id, snapshot_date, kpis_json) VALUES
('GLOBAL', NULL, CURRENT_DATE, '{
  "enseignants_monitorés": 27,
  "indice_risque_moyen": 0.33,
  "gaps_critiques": 14,
  "alertes_nouvelles": 8,
  "taux_couverture": 64.0,
  "en_regression": 3,
  "en_stagnation": 5,
  "alertes_critiques_ouvertes": 3,
  "enseignants_à_risque": 3,
  "répartition": {"CRITIQUE": 0, "ELEVE": 2, "MODERE": 19, "FAIBLE": 6}
}')
ON CONFLICT (scope, scope_id, snapshot_date) DO NOTHING;

-- Marquer la migration comme appliquée
INSERT INTO schema_migrations (version, description)
VALUES ('V8', 'Seed real data for predictive dashboard')
ON CONFLICT (version) DO NOTHING;
