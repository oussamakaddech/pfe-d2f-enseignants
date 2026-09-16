-- =============================================================================
-- V19__consolidate_formateur_into_animateur.sql
-- Consolidation des rôles : FORMATEUR (legacy) -> ANIMATEUR (canonique D2F).
--
-- Phase 1 (sûre, réversible) : on REPOINTE les affectations de compte
-- (table user_roles) du rôle FORMATEUR vers ANIMATEUR. On NE supprime PAS le
-- rôle FORMATEUR ni la contrainte CHECK : il reste accepté comme alias tant que
-- des jetons JWT portant ROLE_FORMATEUR sont encore valides (cf. Phase 2).
--
-- Idempotent : ré-exécutable sans effet (plus aucune ligne FORMATEUR après coup).
-- Rollback : voir bloc commenté en fin de fichier.
-- =============================================================================

DO $$
DECLARE
    formateur_id roles.id%TYPE;
    animateur_id roles.id%TYPE;
BEGIN
    SELECT id INTO formateur_id FROM roles WHERE name = 'FORMATEUR';
    SELECT id INTO animateur_id FROM roles WHERE name = 'ANIMATEUR';

    -- Si l'un des deux rôles n'existe pas (BD neuve), rien à migrer.
    IF formateur_id IS NULL OR animateur_id IS NULL THEN
        RAISE NOTICE 'V19: FORMATEUR ou ANIMATEUR absent, aucune migration.';
        RETURN;
    END IF;

    -- 1) Comptes ayant DÉJÀ ANIMATEUR + FORMATEUR : on retire la ligne FORMATEUR
    --    redondante (évite un doublon (user_id, role_id) après le repointage).
    DELETE FROM user_roles
    WHERE role_id = formateur_id
      AND user_id IN (
          SELECT user_id FROM user_roles WHERE role_id = animateur_id
      );

    -- 2) Comptes restants en FORMATEUR : on repointe vers ANIMATEUR.
    UPDATE user_roles
    SET role_id = animateur_id
    WHERE role_id = formateur_id;

    RAISE NOTICE 'V19: consolidation FORMATEUR -> ANIMATEUR terminée.';
END $$;

-- =============================================================================
-- ROLLBACK MANUEL (Phase 1) — repointer ANIMATEUR vers FORMATEUR :
--   Impossible de distinguer automatiquement les ANIMATEUR d'origine des
--   FORMATEUR migrés (l'info n'est pas conservée). Si un rollback est requis,
--   restaurer depuis une sauvegarde de user_roles prise avant cette migration.
-- =============================================================================
