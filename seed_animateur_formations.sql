-- ============================================================
-- Seed data pour tester /home/animateur-formations
-- ============================================================
-- Objectif : Peupler seance_animateur / seance_participant / presences
-- afin que les utilisateurs admin / Formateur / Enseignant voient les
-- formations EN_COURS dont ils sont animateurs et puissent marquer
-- les présences. Idempotent (ON CONFLICT DO NOTHING).
-- ============================================================

SET search_path TO formation;

-- 1) Ajouter j.dupont (FORMATEUR, rôle auth) dans la table enseignants
--    pour qu'il puisse être animateur de séances.
INSERT INTO enseignants (id, nom, prenom, mail, type, etat, cup, chefdepartement, up_id, dept_id)
VALUES ('F00001', 'DUPONT', 'Jean', 'j.dupont@formation-pro.tn', 'V', 'A', 'N', 'N', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2) Animateurs de la formation 2 (Sécurité Web — EN_COURS)
--    Plusieurs animateurs pour pouvoir tester en se connectant avec différents comptes.
INSERT INTO seance_animateur (seance_id, enseignant_id) VALUES
    (5, 'ENS001'),   -- k.trabelsi@esprit.tn  (ENSEIGNANT)
    (5, 'F00001'),   -- j.dupont@formation-pro.tn (FORMATEUR)
    (6, 'ENS001'),
    (6, 'F00001'),
    (7, 'F00001'),
    (7, 'ENS001')
ON CONFLICT (seance_id, enseignant_id) DO NOTHING;

-- 3) Animateurs de la formation 1 (Spring Boot — ACHEVE)
--    Visible pour le rôle D2F via l'endpoint /achevees.
INSERT INTO seance_animateur (seance_id, enseignant_id) VALUES
    (1, 'ENS003'),   -- a.gharbi@esprit.tn (ENSEIGNANT)
    (2, 'ENS003'),
    (3, 'ENS003'),
    (4, 'ENS003')
ON CONFLICT (seance_id, enseignant_id) DO NOTHING;

-- 4) Animateurs des formations PLANIFIE (3 et 16) — pour montrer la liste complète au D2F
INSERT INTO seance_animateur (seance_id, enseignant_id) VALUES
    (8, 'ENS002'),   -- s.mansouri
    (9, 'ENS002'),
    (22, 'ENS005')   -- l.bensalem
ON CONFLICT (seance_id, enseignant_id) DO NOTHING;

-- 5) Participants des séances de la formation 2 (Sécurité Web)
--    Les enseignants ayant une inscription APPROVED participent à toutes les séances.
INSERT INTO seance_participant (seance_id, enseignant_id) VALUES
    (5, 'ENS002'), (5, 'ENS003'), (5, 'ENS004'),
    (6, 'ENS002'), (6, 'ENS003'), (6, 'ENS004'),
    (7, 'ENS002'), (7, 'ENS003'), (7, 'ENS004')
ON CONFLICT (seance_id, enseignant_id) DO NOTHING;

-- 6) Participants des séances de la formation 1 (Spring Boot — ACHEVE)
--    Déjà existants en partie via la table presences mais on ajoute la relation seance_participant.
INSERT INTO seance_participant (seance_id, enseignant_id) VALUES
    (1, 'ENS001'), (1, 'ENS002'), (1, 'ENS003'),
    (2, 'ENS001'), (2, 'ENS002'), (2, 'ENS003'),
    (3, 'ENS001'), (3, 'ENS002'), (3, 'ENS003'),
    (4, 'ENS001'), (4, 'ENS002'), (4, 'ENS003')
ON CONFLICT (seance_id, enseignant_id) DO NOTHING;

-- 7) Presences (à marquer) pour les séances de la formation 2 EN_COURS
--    Présence initiale = false → l'animateur pourra basculer en TRUE depuis l'UI.
INSERT INTO presences (seance_id, enseignant_id, presence, commentaire)
SELECT s.seance_id, s.enseignant_id, FALSE, NULL
FROM (VALUES
    (5, 'ENS002'), (5, 'ENS003'), (5, 'ENS004'),
    (6, 'ENS002'), (6, 'ENS003'), (6, 'ENS004'),
    (7, 'ENS002'), (7, 'ENS003'), (7, 'ENS004')
) AS s(seance_id, enseignant_id)
WHERE NOT EXISTS (
    SELECT 1 FROM presences p
    WHERE p.seance_id = s.seance_id AND p.enseignant_id = s.enseignant_id
);

-- ============================================================
-- Récap
-- ============================================================
SELECT
    (SELECT COUNT(*) FROM seance_animateur)   AS animateurs,
    (SELECT COUNT(*) FROM seance_participant) AS participants,
    (SELECT COUNT(*) FROM presences)          AS presences;
