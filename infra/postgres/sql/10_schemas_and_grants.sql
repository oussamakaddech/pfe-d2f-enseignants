-- =====================================================================
-- D2F — schémas applicatifs, propriétés et droits inter-schémas
-- =====================================================================
--
-- Appelé par 00_init_roles.sh APRÈS création des rôles. Idempotent : peut
-- être rejoué sur une base existante sans effet de bord.
--
-- POURQUOI CE FICHIER EXISTE
-- --------------------------
-- docker-compose.yml monte ./infra/postgres/init comme
-- docker-entrypoint-initdb.d et référence 00_init_roles.sh, mais `infra/`
-- était gitignoré et les dossiers vides : le provisionnement des rôles et
-- des droits ne vivait que dans le volume Postgres local. Un clone neuf
-- démarrait donc une base sans rôles applicatifs, et tous les services
-- échouaient à se connecter.
--
-- Le symptôme concret rencontré le 2026-09-22 : la migration
-- V45__seed_formations_all_departements.sql (service formation) lit
-- `competence.competences`, mais app_user_formation n'avait pas USAGE sur le
-- schéma competence. Flyway échouait, le service formation ne démarrait pas,
-- et gateway + webapp + analyse restaient bloqués en dépendance.
--
-- MODÈLE DE DROITS
-- ----------------
-- 1. Un service = un rôle = un schéma dont il est PROPRIÉTAIRE (DDL libre,
--    Flyway y crée ses tables).
-- 2. Les lectures inter-services sont EXPLICITES et en SELECT seul. Aucun
--    service n'écrit dans le schéma d'un autre (cf. audit MLOps : le grant
--    ad hoc UPDATE de app_user_analyse sur formation a été révoqué).
-- 3. Tout ajout de droit passe par ce fichier — jamais par un psql manuel,
--    sous peine de reproduire exactement le trou ci-dessus.
--
-- Les mots de passe ne figurent PAS ici : ils sont créés par
-- 00_init_roles.sh depuis les variables DB_PASSWORD_* de l'environnement.
-- =====================================================================

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------
-- 1. Schémas et propriétaires
-- ---------------------------------------------------------------------
-- Identifiants QUOTÉS : `analyse` est un mot réservé PostgreSQL (variante
-- britannique de ANALYZE) et `CREATE SCHEMA analyse` est une erreur de syntaxe.
CREATE SCHEMA IF NOT EXISTS "auth"          AUTHORIZATION app_user_auth;
CREATE SCHEMA IF NOT EXISTS "competence"    AUTHORIZATION app_user_competence;
CREATE SCHEMA IF NOT EXISTS "formation"     AUTHORIZATION app_user_formation;
CREATE SCHEMA IF NOT EXISTS "evaluation"    AUTHORIZATION app_user_evaluation;
CREATE SCHEMA IF NOT EXISTS "certificat"    AUTHORIZATION app_user_certificat;
CREATE SCHEMA IF NOT EXISTS "besoin"        AUTHORIZATION app_user_besoinsformation;
CREATE SCHEMA IF NOT EXISTS "analyse"       AUTHORIZATION app_user_analyse;
CREATE SCHEMA IF NOT EXISTS "notification"  AUTHORIZATION app_user_notification;

-- Rejeu sur une base existante : on réaffirme le propriétaire, sans quoi un
-- schéma créé à la main par le superutilisateur resterait hors de portée DDL
-- du service (Flyway échouerait au prochain déploiement).
ALTER SCHEMA "auth"         OWNER TO app_user_auth;
ALTER SCHEMA "competence"   OWNER TO app_user_competence;
ALTER SCHEMA "formation"    OWNER TO app_user_formation;
ALTER SCHEMA "evaluation"   OWNER TO app_user_evaluation;
ALTER SCHEMA "certificat"   OWNER TO app_user_certificat;
ALTER SCHEMA "besoin"       OWNER TO app_user_besoinsformation;
ALTER SCHEMA "analyse"      OWNER TO app_user_analyse;
ALTER SCHEMA "notification" OWNER TO app_user_notification;

-- ---------------------------------------------------------------------
-- 2. Lectures inter-schémas — service ANALYSE
-- ---------------------------------------------------------------------
-- Le service d'analyse prédictive agrège les données métier des autres
-- services : lecture seule partout, écriture uniquement dans `analyse`.
DO $$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY['besoin','certificat','competence','evaluation','formation','notification']
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO app_user_analyse', s);
    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO app_user_analyse', s);
    -- Tables créées PLUS TARD par les migrations du service propriétaire :
    -- sans privilège par défaut, chaque nouvelle table serait invisible.
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT SELECT ON TABLES TO app_user_analyse',
      CASE s
        WHEN 'besoin'       THEN 'app_user_besoinsformation'
        WHEN 'certificat'   THEN 'app_user_certificat'
        WHEN 'competence'   THEN 'app_user_competence'
        WHEN 'evaluation'   THEN 'app_user_evaluation'
        WHEN 'formation'    THEN 'app_user_formation'
        WHEN 'notification' THEN 'app_user_notification'
      END, s);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3. Lectures inter-schémas — service FORMATION
-- ---------------------------------------------------------------------
-- Le catalogue de formations se rattache au référentiel de compétences :
-- les migrations résolvent compétences et savoirs par leur CODE
-- (V45 : JOIN competence.competences ; V46 : JOIN competence.savoirs).
-- Lecture seule, limitée aux trois tables du référentiel effectivement
-- lues — pas un SELECT sur tout le schéma.
GRANT USAGE ON SCHEMA "competence" TO app_user_formation;
GRANT SELECT ON "competence".competences       TO app_user_formation;
GRANT SELECT ON "competence".sous_competences  TO app_user_formation;
GRANT SELECT ON "competence".savoirs           TO app_user_formation;

-- ---------------------------------------------------------------------
-- 4. Rôle RICE
-- ---------------------------------------------------------------------
-- Le service RICE ne possède aucun schéma : il lit le référentiel exposé
-- dans `public` et écrit via les API des autres services.
GRANT USAGE ON SCHEMA "public" TO app_user_rice;

-- ---------------------------------------------------------------------
-- 5. Contrôle : aucune écriture croisée
-- ---------------------------------------------------------------------
-- Garde-fou explicite (audit MLOps, anomalie 1) : un grant d'écriture
-- accordé à la main sur le schéma d'un autre service serait retiré ici au
-- prochain provisionnement.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON ALL TABLES IN SCHEMA "besoin", "certificat", "competence", "evaluation", "formation", "notification"
  FROM app_user_analyse;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON ALL TABLES IN SCHEMA "competence"
  FROM app_user_formation;
