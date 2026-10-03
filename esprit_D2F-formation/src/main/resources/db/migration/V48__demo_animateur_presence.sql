-- =============================================================================
-- V48__demo_animateur_presence.sql
-- Kit démo vidéo : 1 animateur (ROLE_ANIMATEUR) avec formation + séances liées
-- pour l'écran « Mes Formations à animer » et le marquage des présences.
--
-- Constat : l'écran animateur appelle GET /formations-workflow/animateur qui
-- résout par email JWT via
--   formationRepository.findDistinctBySeancesAnimateursMail(email)
-- donc SEUL le lien seance_animateur fait apparaître la formation.
-- Les seeds V41 ne posaient que formation_animateur (ENS010/ENS012),
-- invisible dans « Mes Formations à animer » (0 ligne seance_animateur).
--
-- Choix démo :
--   Animateur : compte auth 'nchebbi' / n.chebbi@esprit.tn (ROLE_ANIMATEUR,
--               V22 auth, id 00000000-0000-0000-0000-000000ani001).
--               La base vivante ne contient AUCUNE fiche enseignant à ce mail
--               (ENS007/ENS008 y désignent d'autres personnes) : on crée donc
--               la fiche dédiée ANI001 liée au compte via user_id.
--               Mot de passe seed : D2F_SEED_PASSWORD (dev, ex D2F@2026).
--   Formation : 'DevOps & Conteneurisation : Docker et Kubernetes' (EN_COURS,
--               4 séances 12-15) — passées avec historique + à venir pour le live.
--   Séance démo présence : id 14 du 2026-09-17 (Séance 3/4, MIXTE, Salle A104),
--               SANS présences au moment de l'écriture : feuille « à valider ».
--
-- Idempotent : INSERT ... WHERE NOT EXISTS sur chaque lien.
-- =============================================================================

-- 0) Fiche enseignant de l'animatrice (id <= 10 car., cf. Enseignant.id) ───────
INSERT INTO formation.enseignants
    (id, nom, prenom, mail, type, etat, cup, chef_departement, user_id,
     grade, specialite, dossier_status)
SELECT 'ANI001', 'CHEBBI', 'Nadia', 'n.chebbi@esprit.tn', 'P', 'A', 'N', 'N',
       '00000000-0000-0000-0000-000000ani001',
       'Consultante formatrice', 'DevOps, conteneurisation', 'COMPLET'
WHERE NOT EXISTS (SELECT 1 FROM formation.enseignants WHERE id = 'ANI001');

-- Si une autre fiche portait déjà ce mail (unicité applicative « un compte =
-- une fiche »), on ne crée pas de doublon : on rattache le user_id à la fiche
-- existante au lieu d'ANI001 (les liens ci-dessous suivent alors cette fiche).
-- En pratique base vivante : aucun doublon, le bloc ci-dessus suffit.

-- 1) Lien formation_animateur (complément, ne remplace pas ENS010/ENS012) ──────
INSERT INTO formation.formation_animateur (formation_id, enseignant_id)
SELECT f.id_formation, 'ANI001'
FROM formation.formations f
WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
AND NOT EXISTS (
    SELECT 1 FROM formation.formation_animateur fa
    WHERE fa.formation_id = f.id_formation AND fa.enseignant_id = 'ANI001'
);

-- 2) Lien seance_animateur : ANI001 sur les 4 séances (C'EST CE LIEN QUI FAIT
--    APPARAÎTRE LA FORMATION dans « Mes Formations à animer ») ────────────────
INSERT INTO formation.seance_animateur (seance_id, enseignant_id)
SELECT s.id_seance, 'ANI001'
FROM formation.seances s JOIN formation.formations f ON s.formation_id = f.id_formation
WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
AND NOT EXISTS (
    SELECT 1 FROM formation.seance_animateur sa
    WHERE sa.seance_id = s.id_seance AND sa.enseignant_id = 'ANI001'
);

-- 3) Participants de la séance démo (17/09) : alimente le compteur
--    « X participants » de la carte + la feuille de présence ──────────────────
INSERT INTO formation.seance_participant (seance_id, enseignant_id)
SELECT s.id_seance, e.id
FROM formation.seances s
JOIN formation.formations f ON s.formation_id = f.id_formation
CROSS JOIN (VALUES ('ENS001'), ('ENS002'), ('ENS003'), ('ENS011')) AS e(id)
WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
  AND s.date_seance = '2026-09-17'
AND NOT EXISTS (
    SELECT 1 FROM formation.seance_participant sp
    WHERE sp.seance_id = s.id_seance AND sp.enseignant_id = e.id
);

-- 4) Feuille de présence « à valider » pour le live : 4 lignes ABSENT avec
--    commentaire 'Presence a valider' → l'animatrice les bascule en PRESENT
--    via « Tout marquer présent » ou batch (PUT .../seances/{id}/presences/batch
--    ou .../mark-all?present=true, rôle PRESENCE_MARK = ADMIN/CUP/ANIMATEUR).
--    Contrainte uq_presence_session_participant : 1 ligne par (séance, participant).
INSERT INTO formation.presences (presence, status, commentaire, seance_id, enseignant_id)
SELECT false, 'ABSENT', 'Presence a valider', s.id_seance, e.id
FROM formation.seances s
JOIN formation.formations f ON s.formation_id = f.id_formation
CROSS JOIN (VALUES ('ENS001'), ('ENS002'), ('ENS003'), ('ENS011')) AS e(id)
WHERE f.titre_formation = 'DevOps & Conteneurisation : Docker et Kubernetes'
  AND s.date_seance = '2026-09-17'
AND NOT EXISTS (
    SELECT 1 FROM formation.presences p
    WHERE p.seance_id = s.id_seance AND p.enseignant_id = e.id
);
