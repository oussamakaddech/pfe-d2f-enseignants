-- =============================================================================
-- V18__add_animateur_role.sql
-- Description : ajout du rôle ANIMATEUR (cahier des charges D2F). Équivalent
--               fonctionnel de FORMATEUR pour l'animation de formations.
-- =============================================================================

-- 1. Mettre à jour la contrainte CHECK pour inclure ANIMATEUR
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_check;

ALTER TABLE roles
ADD CONSTRAINT roles_name_check
CHECK (name IN ('ADMIN', 'CUP', 'ENSEIGNANT', 'FORMATEUR', 'ANIMATEUR', 'CHEF_DEPARTEMENT', 'RESPONSABLE_DOSSIER'));

-- 2. Insérer le rôle ANIMATEUR (idempotent)
INSERT INTO roles (name)
SELECT 'ANIMATEUR'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ANIMATEUR');
