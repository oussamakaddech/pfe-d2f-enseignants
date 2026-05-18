-- =============================================================================
-- DSI §3.4 — Isolation des utilisateurs PostgreSQL par service
-- Convention : un rôle "app_user_{service}" par microservice
-- Exécuté automatiquement au premier démarrage de postgres:15-alpine
-- (cf. docker-entrypoint-initdb.d). Idempotent.
-- =============================================================================

-- Les mots de passe sont injectés via GUC custom set au démarrage Postgres
-- (POSTGRES_INITDB_ARGS dans docker-compose.yml) puis lus via current_setting().

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('app_user_auth',              'd2f.pwd_auth'),
      ('app_user_formation',         'd2f.pwd_formation'),
      ('app_user_besoinsformation',  'd2f.pwd_besoin'),
      ('app_user_evaluation',        'd2f.pwd_evaluation'),
      ('app_user_certificat',        'd2f.pwd_certificat'),
      ('app_user_competence',        'd2f.pwd_competence'),
      ('app_user_analyse',           'd2f.pwd_analyse')
    ) AS t(role_name, pwd_key)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r.role_name) THEN
      EXECUTE format(
        'CREATE ROLE %I LOGIN PASSWORD %L',
        r.role_name,
        current_setting(r.pwd_key)
      );
    END IF;
  END LOOP;
END $$;

-- Schémas dédiés (ownership donnée au rôle applicatif)
CREATE SCHEMA IF NOT EXISTS auth       AUTHORIZATION app_user_auth;
CREATE SCHEMA IF NOT EXISTS formation  AUTHORIZATION app_user_formation;
CREATE SCHEMA IF NOT EXISTS besoin     AUTHORIZATION app_user_besoinsformation;
CREATE SCHEMA IF NOT EXISTS evaluation AUTHORIZATION app_user_evaluation;
CREATE SCHEMA IF NOT EXISTS certificat AUTHORIZATION app_user_certificat;
CREATE SCHEMA IF NOT EXISTS competence AUTHORIZATION app_user_competence;
CREATE SCHEMA IF NOT EXISTS analyse    AUTHORIZATION app_user_analyse;
