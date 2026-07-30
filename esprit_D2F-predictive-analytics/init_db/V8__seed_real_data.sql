-- ============================================================
-- V8-fix — Seed corrected data for the predictive dashboard
-- Fixes: schema-qualified names, proper column types, matches actual DB schema
-- ============================================================

SET search_path = "analyse", "formation", "competence", "besoin", "evaluation", "certificat", "auth", "public";

-- ── 1. Clean old data (idempotent) ──────────────────────────
DELETE FROM "analyse".alert_events WHERE enseignant_id IN ('E00003','E00004','ENSTEST001');
DELETE FROM "analyse".teacher_risk_profiles WHERE enseignant_id IN ('E00003','E00004','ENSTEST001');
DELETE FROM "analyse".skill_gaps WHERE enseignant_id IN ('E00003','E00004','ENSTEST001');
DELETE FROM "analyse".dashboard_snapshots;

-- ── 2. Update existing teachers + insert new ones in formation.enseignants ──
-- First update existing 6 teachers to have proper dept_id/up_id
UPDATE "formation".enseignants SET dept_id = 'DEPT_RT',  up_id = 'UP_RT',  type = 'T', etat = 'A', cup = 'N', chef_departement = 'N' WHERE id = 'ENS001';
UPDATE "formation".enseignants SET dept_id = 'DEPT_GL',  up_id = 'UP_GL',  type = 'T', etat = 'A', cup = 'N', chef_departement = 'N' WHERE id = 'ENS002';
UPDATE "formation".enseignants SET dept_id = 'DEPT_INFO', up_id = 'UP_INFO', type = 'T', etat = 'A', cup = 'N', chef_departement = 'N' WHERE id = 'ENS003';
UPDATE "formation".enseignants SET dept_id = 'DEPT_GL',  up_id = 'UP_GL',  type = 'T', etat = 'A', cup = 'N', chef_departement = 'N' WHERE id = 'ENS004';
UPDATE "formation".enseignants SET dept_id = 'DEPT_INFO', up_id = 'UP_INFO', type = 'T', etat = 'A', cup = 'N', chef_departement = 'N' WHERE id = 'ENS005';
UPDATE "formation".enseignants SET dept_id = NULL, up_id = NULL, type = 'V', etat = 'A', cup = 'N', chef_departement = 'N' WHERE id = 'FORM001';

-- Insert remaining teachers (ENS006-ENS026)
INSERT INTO "formation".enseignants (id, nom, prenom, mail, type, etat, cup, chef_departement, up_id, dept_id, version)
VALUES
    ('ENS006', 'Khemiri',  'Nour',    'n.khemiri@esprit.tn',  'T', 'A', 'N', 'N', 'UP_INFO', 'DEPT_INFO', 0),
    ('ENS007', 'Mansouri', 'Walid',   'w.mansouri@esprit.tn', 'T', 'A', 'N', 'N', 'UP_INFO', 'DEPT_INFO', 0),
    ('ENS008', 'Gharbi',   'Imen',    'i.gharbi@esprit.tn',   'T', 'A', 'N', 'N', 'UP_INFO', 'DEPT_INFO', 0),
    ('ENS009', 'Ali',      'Mohamed', 'm.ali@esprit.tn',      'T', 'A', 'N', 'N', 'UP_INFO', 'DEPT_INFO', 0),
    ('ENS010', 'Trabelsi',   'Sihem',   's.trabelsi@esprit.tn',   'T', 'A', 'N', 'N', 'UP_RT',  'DEPT_RT',  0),
    ('ENS011', 'Mejri',      'Anis',    'a.mejri@esprit.tn',      'T', 'A', 'N', 'N', 'UP_RT',  'DEPT_RT',  0),
    ('ENS012', 'BenYoussef', 'Wafa',    'w.benyoussef@esprit.tn', 'T', 'A', 'N', 'N', 'UP_RT',  'DEPT_RT',  0),
    ('ENS013', 'Gharbi',     'Walid',   'w.gharbi@esprit.tn',     'T', 'A', 'N', 'N', 'UP_RT',  'DEPT_RT',  0),
    ('ENS014', 'Bougherara', 'Karim',   'k.bougherara@esprit.tn', 'T', 'A', 'N', 'N', 'UP_GC',  'DEPT_GC',  0),
    ('ENS015', 'Mroueh',     'Sihem',   's.mroueh@esprit.tn',     'T', 'A', 'N', 'N', 'UP_GC',  'DEPT_GC',  0),
    ('ENS016', 'Salah',      'Mohamed', 'm.salah@esprit.tn',      'T', 'A', 'N', 'N', 'UP_GC',  'DEPT_GC',  0),
    ('ENS017', 'Haddad',     'Amira',   'a.haddad@esprit.tn',     'T', 'A', 'N', 'N', 'UP_GC',  'DEPT_GC',  0),
    ('ENS018', 'Mansouri',   'Youssef', 'y.mansouri@esprit.tn',   'T', 'A', 'N', 'N', 'UP_WEB', 'DEPT_WEB', 0),
    ('ENS019', 'Bousso',     'Ghada',   'g.bousso@esprit.tn',     'T', 'A', 'N', 'N', 'UP_WEB', 'DEPT_WEB', 0),
    ('ENS020', 'Djerba',     'Karim',   'k.djerba@esprit.tn',     'T', 'A', 'N', 'N', 'UP_WEB', 'DEPT_WEB', 0),
    ('ENS021', 'Ali',        'Meriem',  'm.ali2@esprit.tn',       'T', 'A', 'N', 'N', 'UP_WEB', 'DEPT_WEB', 0),
    ('ENS022', 'Cherif',     'Ahmed',   'a.cherif@esprit.tn',     'T', 'A', 'N', 'N', 'UP_IA',  'DEPT_IA',  0),
    ('ENS023', 'Haddad',     'Fatma',   'f.haddad@esprit.tn',     'T', 'A', 'N', 'N', 'UP_IA',  'DEPT_IA',  0),
    ('ENS024', 'Djerba',     'Karim2',  'k.djerba2@esprit.tn',    'T', 'A', 'N', 'N', 'UP_IA',  'DEPT_IA',  0),
    ('ENS025', 'Bensaid',    'Samir',   's.bensaid@esprit.tn',    'T', 'A', 'N', 'N', 'UP_IA',  'DEPT_IA',  0),
    ('ENS026', 'Mejri',      'Nour2',   'n.mejri@esprit.tn',      'T', 'A', 'N', 'N', 'UP_IA',  'DEPT_IA',  0),
    ('ENS027', 'Salah',      'Mohamed2','m.salah2@esprit.tn',     'V', 'A', 'N', 'N', NULL,     NULL,       0)
ON CONFLICT (id) DO UPDATE SET
    dept_id = EXCLUDED.dept_id, up_id = EXCLUDED.up_id, type = EXCLUDED.type;

-- ── 3. Skill Gaps (104 rows for 27 teachers) ───────────────
DELETE FROM "analyse".skill_gaps WHERE enseignant_id LIKE 'ENS%' OR enseignant_id = 'FORM001';

-- GL dept (ENS001-ENS005)
INSERT INTO "analyse".skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at) VALUES
    ('ENS001', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 4, 8, 3, 0.50, 0.60, 0.55, 0.58, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS001', 4, 'C4', 'Architecture logicielle', 1, 'Genie Logiciel', 3, 7, 3, 0.57, 0.50, 0.50, 0.52, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS001', 6, 'C6', 'Qualite et Tests', 1, 'Genie Logiciel', 5, 9, 3, 0.44, 0.40, 0.45, 0.43, 'MODEREE', 0, FALSE, 0, now()),
    ('ENS001', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 6, 7, 3, 0.14, 0.30, 0.20, 0.21, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS002', 4, 'C4', 'Architecture logicielle', 1, 'Genie Logiciel', 2, 8, 3, 0.75, 0.70, 0.65, 0.70, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS002', 6, 'C6', 'Qualite et Tests', 1, 'Genie Logiciel', 3, 9, 3, 0.67, 0.55, 0.60, 0.61, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS002', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 7, 8, 3, 0.13, 0.40, 0.30, 0.28, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS002', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 5, 8, 3, 0.38, 0.45, 0.40, 0.41, 'MODEREE', 0, FALSE, 0, now()),
    ('ENS003', 6, 'C6', 'Qualite et Tests', 1, 'Genie Logiciel', 1, 9, 3, 0.89, 0.80, 0.75, 0.81, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS003', 4, 'C4', 'Architecture logicielle', 1, 'Genie Logiciel', 4, 8, 3, 0.50, 0.50, 0.45, 0.48, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS003', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 6, 8, 3, 0.25, 0.35, 0.30, 0.30, 'MODEREE', 0, FALSE, 0, now()),
    ('ENS003', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 5, 7, 3, 0.29, 0.30, 0.25, 0.28, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS004', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 2, 8, 3, 0.75, 0.65, 0.60, 0.67, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS004', 4, 'C4', 'Architecture logicielle', 1, 'Genie Logiciel', 3, 7, 3, 0.57, 0.50, 0.45, 0.51, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS004', 6, 'C6', 'Qualite et Tests', 1, 'Genie Logiciel', 4, 9, 3, 0.56, 0.45, 0.50, 0.50, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS004', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 6, 8, 3, 0.25, 0.30, 0.25, 0.27, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS005', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 3, 8, 3, 0.63, 0.55, 0.50, 0.56, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS005', 3, 'C3', 'Developpement Frontend', 1, 'Genie Logiciel', 2, 8, 3, 0.75, 0.50, 0.45, 0.57, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS005', 4, 'C4', 'Architecture logicielle', 1, 'Genie Logiciel', 4, 7, 3, 0.43, 0.40, 0.35, 0.40, 'MODEREE', 0, FALSE, 0, now()),
    ('ENS005', 6, 'C6', 'Qualite et Tests', 1, 'Genie Logiciel', 5, 9, 3, 0.44, 0.40, 0.40, 0.42, 'MODEREE', 0, FALSE, 0, now())
;
-- INFO dept (ENS006-ENS009)
INSERT INTO "analyse".skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at) VALUES
    ('ENS006', 5, 'C5', 'Bases de donnees', 2, 'Informatique', 2, 9, 3, 0.78, 0.65, 0.60, 0.68, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS006', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 4, 8, 3, 0.50, 0.45, 0.40, 0.45, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS006', 6, 'C6', 'Qualite et Tests', 1, 'Genie Logiciel', 3, 8, 3, 0.63, 0.40, 0.35, 0.44, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS006', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 6, 7, 3, 0.14, 0.25, 0.20, 0.20, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS007', 5, 'C5', 'Bases de donnees', 2, 'Informatique', 3, 9, 3, 0.67, 0.55, 0.50, 0.57, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS007', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 5, 8, 3, 0.38, 0.40, 0.35, 0.38, 'MODEREE', 0, FALSE, 0, now()),
    ('ENS007', 4, 'C4', 'Architecture logicielle', 1, 'Genie Logiciel', 3, 7, 3, 0.57, 0.45, 0.40, 0.47, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS007', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 7, 8, 3, 0.13, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS008', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 2, 8, 3, 0.75, 0.60, 0.55, 0.63, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS008', 5, 'C5', 'Bases de donnees', 2, 'Informatique', 4, 9, 3, 0.56, 0.50, 0.45, 0.50, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS008', 6, 'C6', 'Qualite et Tests', 1, 'Genie Logiciel', 3, 8, 3, 0.63, 0.45, 0.40, 0.49, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS008', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 6, 7, 3, 0.14, 0.25, 0.20, 0.20, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS009', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 3, 8, 3, 0.63, 0.50, 0.45, 0.53, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS009', 5, 'C5', 'Bases de donnees', 2, 'Informatique', 3, 9, 3, 0.67, 0.55, 0.50, 0.57, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS009', 4, 'C4', 'Architecture logicielle', 1, 'Genie Logiciel', 3, 7, 3, 0.57, 0.45, 0.40, 0.47, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS009', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 7, 8, 3, 0.13, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE, 0, now())
;
-- RT dept (ENS010-ENS013)
INSERT INTO "analyse".skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at) VALUES
    ('ENS010', 7, 'C7', 'Securite applicative', 3, 'Reseaux', 2, 8, 3, 0.75, 0.65, 0.60, 0.67, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS010', 8, 'C8', 'Reseaux et Systemes', 3, 'Reseaux', 4, 9, 3, 0.56, 0.50, 0.45, 0.50, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS010', 9, 'C9', 'Infrastructure et Cloud', 3, 'Reseaux', 3, 8, 3, 0.63, 0.55, 0.50, 0.56, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS010', 12, 'C12', 'DevOps', 3, 'Reseaux', 4, 8, 3, 0.50, 0.45, 0.40, 0.45, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS011', 9, 'C9', 'Infrastructure et Cloud', 3, 'Reseaux', 1, 9, 3, 0.89, 0.80, 0.75, 0.81, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS011', 8, 'C8', 'Reseaux et Systemes', 3, 'Reseaux', 3, 8, 3, 0.63, 0.60, 0.55, 0.59, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS011', 7, 'C7', 'Securite applicative', 3, 'Reseaux', 4, 7, 3, 0.43, 0.50, 0.45, 0.46, 'MODEREE', 0, FALSE, 0, now()),
    ('ENS011', 12, 'C12', 'DevOps', 3, 'Reseaux', 2, 8, 3, 0.75, 0.55, 0.50, 0.57, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS012', 12, 'C12', 'DevOps', 3, 'Reseaux', 2, 8, 3, 0.75, 0.55, 0.50, 0.57, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS012', 9, 'C9', 'Infrastructure et Cloud', 3, 'Reseaux', 3, 9, 3, 0.67, 0.55, 0.50, 0.57, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS012', 8, 'C8', 'Reseaux et Systemes', 3, 'Reseaux', 4, 8, 3, 0.50, 0.45, 0.40, 0.45, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS012', 7, 'C7', 'Securite applicative', 3, 'Reseaux', 3, 7, 3, 0.57, 0.50, 0.45, 0.51, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS013', 8, 'C8', 'Reseaux et Systemes', 3, 'Reseaux', 2, 9, 3, 0.78, 0.60, 0.55, 0.63, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS013', 9, 'C9', 'Infrastructure et Cloud', 3, 'Reseaux', 3, 8, 3, 0.63, 0.55, 0.50, 0.56, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS013', 7, 'C7', 'Securite applicative', 3, 'Reseaux', 3, 7, 3, 0.57, 0.50, 0.45, 0.51, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS013', 12, 'C12', 'DevOps', 3, 'Reseaux', 4, 8, 3, 0.50, 0.45, 0.40, 0.45, 'HAUTE', 0, FALSE, 0, now())
;
-- GC dept (ENS014-ENS017)
INSERT INTO "analyse".skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at) VALUES
    ('ENS014', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 5, 8, 3, 0.38, 0.40, 0.35, 0.38, 'MODEREE', 0, FALSE, 0, now()),
    ('ENS014', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS014', 3, 'C3', 'Developpement Frontend', 1, 'Genie Logiciel', 4, 7, 3, 0.43, 0.35, 0.30, 0.36, 'MODEREE', 0, FALSE, 0, now()),
    ('ENS015', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 6, 8, 3, 0.25, 0.35, 0.30, 0.30, 'MODEREE', 0, FALSE, 0, now()),
    ('ENS015', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 5, 7, 3, 0.29, 0.30, 0.25, 0.28, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS015', 3, 'C3', 'Developpement Frontend', 1, 'Genie Logiciel', 3, 7, 3, 0.57, 0.35, 0.30, 0.37, 'MODEREE', 0, FALSE, 0, now()),
    ('ENS016', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 4, 8, 3, 0.50, 0.35, 0.30, 0.38, 'MODEREE', 0, FALSE, 0, now()),
    ('ENS016', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 7, 7, 3, 0.00, 0.25, 0.20, 0.15, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS016', 3, 'C3', 'Developpement Frontend', 1, 'Genie Logiciel', 5, 7, 3, 0.29, 0.30, 0.25, 0.28, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS017', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 3, 8, 3, 0.63, 0.40, 0.35, 0.42, 'MODEREE', 0, FALSE, 0, now()),
    ('ENS017', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS017', 3, 'C3', 'Developpement Frontend', 1, 'Genie Logiciel', 4, 7, 3, 0.43, 0.35, 0.30, 0.36, 'MODEREE', 0, FALSE, 0, now())
;
-- WEB dept (ENS018-ENS021)
INSERT INTO "analyse".skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at) VALUES
    ('ENS018', 3, 'C3', 'Developpement Frontend', 1, 'Genie Logiciel', 2, 9, 3, 0.78, 0.65, 0.60, 0.68, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS018', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 4, 8, 3, 0.50, 0.50, 0.45, 0.47, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS018', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS018', 6, 'C6', 'Qualite et Tests', 1, 'Genie Logiciel', 3, 8, 3, 0.63, 0.45, 0.40, 0.49, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS019', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 3, 8, 3, 0.63, 0.55, 0.50, 0.56, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS019', 3, 'C3', 'Developpement Frontend', 1, 'Genie Logiciel', 4, 9, 3, 0.56, 0.50, 0.45, 0.50, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS019', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS019', 6, 'C6', 'Qualite et Tests', 1, 'Genie Logiciel', 4, 8, 3, 0.50, 0.45, 0.40, 0.45, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS020', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 2, 8, 3, 0.75, 0.60, 0.55, 0.63, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS020', 3, 'C3', 'Developpement Frontend', 1, 'Genie Logiciel', 3, 9, 3, 0.67, 0.55, 0.50, 0.57, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS020', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 5, 7, 3, 0.29, 0.30, 0.25, 0.28, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS020', 6, 'C6', 'Qualite et Tests', 1, 'Genie Logiciel', 4, 8, 3, 0.50, 0.45, 0.40, 0.45, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS021', 3, 'C3', 'Developpement Frontend', 1, 'Genie Logiciel', 4, 9, 3, 0.56, 0.50, 0.45, 0.50, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS021', 2, 'C2', 'Developpement Backend', 1, 'Genie Logiciel', 5, 8, 3, 0.38, 0.45, 0.40, 0.41, 'MODEREE', 0, FALSE, 0, now()),
    ('ENS021', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS021', 6, 'C6', 'Qualite et Tests', 1, 'Genie Logiciel', 3, 8, 3, 0.63, 0.45, 0.40, 0.49, 'HAUTE', 0, FALSE, 0, now())
;
-- IA dept (ENS022-ENS026)
INSERT INTO "analyse".skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at) VALUES
    ('ENS022', 10, 'C10', 'Machine Learning', 4, 'Intelligence Artificielle', 2, 9, 3, 0.78, 0.70, 0.65, 0.71, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS022', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS022', 5, 'C5', 'Bases de donnees', 2, 'Informatique', 4, 8, 3, 0.50, 0.45, 0.40, 0.45, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS023', 11, 'C11', 'Deep Learning', 4, 'Intelligence Artificielle', 1, 9, 3, 0.89, 0.85, 0.80, 0.85, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS023', 10, 'C10', 'Machine Learning', 4, 'Intelligence Artificielle', 3, 8, 3, 0.63, 0.60, 0.55, 0.59, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS023', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS024', 5, 'C5', 'Bases de donnees', 2, 'Informatique', 2, 8, 3, 0.75, 0.55, 0.50, 0.57, 'CRITIQUE', 0, FALSE, 0, now()),
    ('ENS024', 10, 'C10', 'Machine Learning', 4, 'Intelligence Artificielle', 3, 9, 3, 0.67, 0.60, 0.55, 0.61, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS024', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS025', 10, 'C10', 'Machine Learning', 4, 'Intelligence Artificielle', 3, 9, 3, 0.67, 0.55, 0.50, 0.57, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS025', 11, 'C11', 'Deep Learning', 4, 'Intelligence Artificielle', 4, 8, 3, 0.50, 0.50, 0.45, 0.47, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS025', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE, 0, now()),
    ('ENS026', 10, 'C10', 'Machine Learning', 4, 'Intelligence Artificielle', 4, 9, 3, 0.56, 0.50, 0.45, 0.50, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS026', 11, 'C11', 'Deep Learning', 4, 'Intelligence Artificielle', 3, 8, 3, 0.63, 0.55, 0.50, 0.56, 'HAUTE', 0, FALSE, 0, now()),
    ('ENS026', 1, 'C1', 'Conception pedagogique', 0, 'Pedagogie', 6, 7, 3, 0.14, 0.30, 0.25, 0.23, 'FAIBLE', 0, FALSE, 0, now())
;

-- FORM001 (vacataire)
INSERT INTO "analyse".skill_gaps (enseignant_id, competence_id, competence_code, competence_nom, domaine_id, domaine_nom,
    niveau_actuel, niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
    niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, computed_at) VALUES
    ('FORM001', 6, 'C6', 'Qualite et Tests', 1, 'Genie Logiciel', 3, 8, 3, 0.63, 0.40, 0.35, 0.44, 'HAUTE', 0, FALSE, 0, now());

-- ── 4. Teacher Risk Profiles ────────────────────────────────
DELETE FROM "analyse".teacher_risk_profiles WHERE enseignant_id LIKE 'ENS%' OR enseignant_id = 'FORM001';

INSERT INTO "analyse".teacher_risk_profiles
  (enseignant_id, score_risque, niveau_risque, nb_gaps_critiques, nb_gaps_moderes,
   nb_gaps_faibles, nb_mois_stagnation_max, tendance, taux_completion_formations,
   facteurs_risque, computed_at) VALUES
  ('ENS001', 0.28, 'MODERE',  0, 2, 2, 0, 'STABLE', 65.0, '{"no_training":0.35}'::jsonb, now()),
  ('ENS002', 0.32, 'MODERE',  1, 2, 1, 0, 'STABLE', 60.0, '{"no_training":0.40}'::jsonb, now()),
  ('ENS003', 0.42, 'MODERE',  1, 2, 1, 0, 'STABLE', 55.0, '{"no_training":0.45}'::jsonb, now()),
  ('ENS004', 0.35, 'MODERE',  1, 2, 1, 0, 'STABLE', 58.0, '{"no_training":0.42}'::jsonb, now()),
  ('ENS005', 0.38, 'MODERE',  1, 2, 1, 0, 'STABLE', 52.0, '{"no_training":0.48}'::jsonb, now()),
  ('ENS006', 0.33, 'MODERE',  1, 2, 1, 0, 'STABLE', 62.0, '{"no_training":0.38}'::jsonb, now()),
  ('ENS007', 0.25, 'MODERE',  0, 3, 1, 0, 'STABLE', 68.0, '{"no_training":0.32}'::jsonb, now()),
  ('ENS008', 0.30, 'MODERE',  1, 2, 1, 0, 'STABLE', 57.0, '{"no_training":0.43}'::jsonb, now()),
  ('ENS009', 0.25, 'MODERE',  0, 3, 1, 0, 'STABLE', 64.0, '{"no_training":0.36}'::jsonb, now()),
  ('ENS010', 0.45, 'MODERE',  1, 3, 0, 0, 'STABLE', 50.0, '{"no_training":0.50}'::jsonb, now()),
  ('ENS011', 0.52, 'ELEVE',   2, 2, 0, 0, 'STABLE', 45.0, '{"no_training":0.55}'::jsonb, now()),
  ('ENS012', 0.48, 'MODERE',  1, 3, 0, 0, 'STABLE', 48.0, '{"no_training":0.52}'::jsonb, now()),
  ('ENS013', 0.40, 'MODERE',  1, 3, 0, 0, 'STABLE', 53.0, '{"no_training":0.47}'::jsonb, now()),
  ('ENS014', 0.18, 'FAIBLE',  0, 2, 1, 0, 'STABLE', 72.0, '{"no_training":0.28}'::jsonb, now()),
  ('ENS015', 0.20, 'FAIBLE',  0, 2, 1, 0, 'STABLE', 70.0, '{"no_training":0.30}'::jsonb, now()),
  ('ENS016', 0.15, 'FAIBLE',  0, 1, 2, 0, 'STABLE', 75.0, '{"no_training":0.25}'::jsonb, now()),
  ('ENS017', 0.22, 'FAIBLE',  0, 2, 1, 0, 'STABLE', 68.0, '{"no_training":0.32}'::jsonb, now()),
  ('ENS018', 0.35, 'MODERE',  1, 2, 1, 0, 'STABLE', 56.0, '{"no_training":0.44}'::jsonb, now()),
  ('ENS019', 0.32, 'MODERE',  1, 2, 1, 0, 'STABLE', 59.0, '{"no_training":0.41}'::jsonb, now()),
  ('ENS020', 0.38, 'MODERE',  1, 2, 1, 0, 'STABLE', 54.0, '{"no_training":0.46}'::jsonb, now()),
  ('ENS021', 0.28, 'MODERE',  0, 2, 2, 0, 'STABLE', 63.0, '{"no_training":0.37}'::jsonb, now()),
  ('ENS022', 0.42, 'MODERE',  1, 1, 1, 0, 'STABLE', 51.0, '{"no_training":0.49}'::jsonb, now()),
  ('ENS023', 0.58, 'ELEVE',   2, 1, 0, 0, 'STABLE', 43.0, '{"no_training":0.57}'::jsonb, now()),
  ('ENS024', 0.35, 'MODERE',  1, 1, 1, 0, 'STABLE', 55.0, '{"no_training":0.45}'::jsonb, now()),
  ('ENS025', 0.30, 'MODERE',  0, 2, 1, 0, 'STABLE', 60.0, '{"no_training":0.40}'::jsonb, now()),
  ('ENS026', 0.25, 'MODERE',  0, 2, 1, 0, 'STABLE', 62.0, '{"no_training":0.38}'::jsonb, now()),
  ('FORM001', 0.15, 'FAIBLE', 0, 1, 0, 0, 'STABLE', 40.0, '{"no_training":0.20}'::jsonb, now())
ON CONFLICT (enseignant_id) DO UPDATE SET
  score_risque = EXCLUDED.score_risque, niveau_risque = EXCLUDED.niveau_risque,
  nb_gaps_critiques = EXCLUDED.nb_gaps_critiques, nb_gaps_moderes = EXCLUDED.nb_gaps_moderes,
  nb_gaps_faibles = EXCLUDED.nb_gaps_faibles, tendance = EXCLUDED.tendance,
  taux_completion_formations = EXCLUDED.taux_completion_formations,
  facteurs_risque = EXCLUDED.facteurs_risque, computed_at = now();

-- ── 5. Alert Events ─────────────────────────────────────────
INSERT INTO "analyse".alert_events
  (type_alerte, cible_type, enseignant_id, departement_id, competence_id,
   severite, titre, message, details_json, statut, created_at)
VALUES
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS003', 'DEPT_INFO', 6, 'CRITICAL',
   'Gap critique - Qualite et Tests', 'Niveau actuel 1 / requis 9.', '{"competence":"Qualite et Tests","ecart":8}'::jsonb, 'NOUVELLE', now() - interval '7 days'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS011', 'DEPT_RT', 9, 'CRITICAL',
   'Gap critique - Infrastructure et Cloud', 'Niveau actuel 1 / requis 9.', '{"competence":"Infrastructure et Cloud","ecart":8}'::jsonb, 'NOUVELLE', now() - interval '5 days'),
  ('GAP_CRITIQUE', 'ENSEIGNANT', 'ENS023', 'DEPT_IA', 11, 'CRITICAL',
   'Gap critique - Deep Learning', 'Niveau actuel 1 / requis 9.', '{"competence":"Deep Learning","ecart":8}'::jsonb, 'NOUVELLE', now() - interval '3 days'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS001', 'DEPT_RT', 2, 'WARNING',
   'Stagnation - Backend', 'Aucune formation validee depuis 6 mois.', '{"mois_stagnation":6}'::jsonb, 'ACTIVE', now() - interval '10 days'),
  ('STAGNATION', 'ENSEIGNANT', 'ENS005', 'DEPT_GL', 3, 'WARNING',
   'Stagnation - Frontend', 'Aucune progression detectee.', '{"mois_stagnation":5}'::jsonb, 'ACTIVE', now() - interval '8 days'),
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'ENS022', 'DEPT_IA', 10, 'WARNING',
   'Completion insuffisant', 'Taux de completion faible.', '{"taux":0.51}'::jsonb, 'ACTIVE', now() - interval '12 days'),
  ('COMPLETION_FAIBLE', 'ENSEIGNANT', 'ENS018', 'DEPT_WEB', 3, 'WARNING',
   'Completion insuffisant', 'Taux de completion faible.', '{"taux":0.56}'::jsonb, 'ACTIVE', now() - interval '15 days');

-- ── 6. Dashboard Snapshot
INSERT INTO "analyse".dashboard_snapshots (scope, scope_id, snapshot_date, kpis_json)
VALUES ('GLOBAL', NULL, CURRENT_DATE, '{
  "enseignants_monitores": 27,
  "indice_risque_moyen": 0.33,
  "gaps_critiques": 14,
  "alertes_nouvelles": 7,
  "taux_couverture": 64.0,
  "en_regression": 0,
  "en_stagnation": 2,
  "alertes_critiques_ouvertes": 3,
  "enseignants_a_risque": 2,
  "repartition": {"CRITIQUE": 0, "ELEVE": 2, "MODERE": 19, "FAIBLE": 6}
}'::jsonb)
ON CONFLICT (scope, scope_id, snapshot_date) DO UPDATE SET kpis_json = EXCLUDED.kpis_json;

SELECT 'V8-fix applied successfully' AS status;
