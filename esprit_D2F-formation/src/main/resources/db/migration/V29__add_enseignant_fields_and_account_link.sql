-- =============================================================================
-- V29 : champs métier manquants sur enseignants + lien explicite vers le compte
--       (audit DSI « Création d'Enseignant »).
-- =============================================================================

-- 1. Champs métier manquants
ALTER TABLE enseignants
    ADD COLUMN IF NOT EXISTS grade      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS telephone  VARCHAR(30),
    ADD COLUMN IF NOT EXISTS photo_url  VARCHAR(500),
    ADD COLUMN IF NOT EXISTS user_id    VARCHAR(36);

-- 2. Lien 1..1 vers le compte (auth.users) — PAS de FK SQL : users vit dans un
--    autre microservice / autre base. On garantit « un compte = une fiche »
--    par un index UNIQUE partiel (plusieurs enseignants peuvent ne pas encore
--    avoir de compte → user_id NULL autorisé en multiple).
CREATE UNIQUE INDEX IF NOT EXISTS ux_enseignants_user_id
    ON enseignants (user_id) WHERE user_id IS NOT NULL;

-- 3. Unicité de l'email dans l'annuaire (évite les doublons de fiche).
CREATE UNIQUE INDEX IF NOT EXISTS ux_enseignants_mail
    ON enseignants (mail);
