-- Migration schema-per-service PostgreSQL
-- Cree les schemas par service et isole les tables existantes
-- Execute avec: docker compose exec -T postgres psql -U d2f -d d2f < scripts/migrate-schemas.sql

BEGIN;

-- 1. Creer les schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS formation;
CREATE SCHEMA IF NOT EXISTS evaluation;
CREATE SCHEMA IF NOT EXISTS certificat;
CREATE SCHEMA IF NOT EXISTS besoin;
CREATE SCHEMA IF NOT EXISTS competence;

-- 2. Déplacer les tables auth-service vers schema auth
ALTER TABLE IF EXISTS public.users SET SCHEMA auth;
ALTER TABLE IF EXISTS public.roles SET SCHEMA auth;
ALTER TABLE IF EXISTS public.user_roles SET SCHEMA auth;
ALTER TABLE IF EXISTS public.confirmation_key SET SCHEMA auth;
ALTER TABLE IF EXISTS public.audit_logs SET SCHEMA auth;
ALTER TABLE IF EXISTS public.user_devices SET SCHEMA auth;

-- 3. Déplacer les tables formation-service
ALTER TABLE IF EXISTS public.formations SET SCHEMA formation;
ALTER TABLE IF EXISTS public.enseignants SET SCHEMA formation;
ALTER TABLE IF EXISTS public.inscriptions SET SCHEMA formation;
ALTER TABLE IF EXISTS public.presences SET SCHEMA formation;
ALTER TABLE IF EXISTS public.seances SET SCHEMA formation;
ALTER TABLE IF EXISTS public.documents SET SCHEMA formation;
ALTER TABLE IF EXISTS public.ups SET SCHEMA formation;
ALTER TABLE IF EXISTS public.departements SET SCHEMA formation;
ALTER TABLE IF EXISTS public.formation_competences SET SCHEMA formation;

-- 4. Déplacer les tables evaluation-service
ALTER TABLE IF EXISTS public.evaluation_globale SET SCHEMA evaluation;
ALTER TABLE IF EXISTS public.evaluation_formateur SET SCHEMA evaluation;

-- 5. Déplacer les tables certificat-service
ALTER TABLE IF EXISTS public.certificates SET SCHEMA certificat;

-- 6. Déplacer les tables besoin-formation
ALTER TABLE IF EXISTS public.besoin_formation SET SCHEMA besoin;
ALTER TABLE IF EXISTS public.notification SET SCHEMA besoin;

-- 7. Déplacer les tables competence-service
ALTER TABLE IF EXISTS public.competences SET SCHEMA competence;
ALTER TABLE IF EXISTS public.sous_competences SET SCHEMA competence;
ALTER TABLE IF EXISTS public.savoirs SET SCHEMA competence;
ALTER TABLE IF EXISTS public.domaines SET SCHEMA competence;
ALTER TABLE IF EXISTS public.enseignant_competences SET SCHEMA competence;
ALTER TABLE IF EXISTS public.competence_prerequisite SET SCHEMA competence;
ALTER TABLE IF EXISTS public.niveau_savoir_requis SET SCHEMA competence;
ALTER TABLE IF EXISTS public.rice_import_logs SET SCHEMA competence;

-- 8. Migrer les Flyway history tables vers leur schema
ALTER TABLE IF EXISTS public.flyway_schema_history SET SCHEMA formation;
ALTER TABLE IF EXISTS public.flyway_schema_history_auth SET SCHEMA auth;
ALTER TABLE IF EXISTS public.flyway_schema_history_besoin SET SCHEMA besoin;
ALTER TABLE IF EXISTS public.flyway_schema_history_competence SET SCHEMA competence;

COMMIT;
