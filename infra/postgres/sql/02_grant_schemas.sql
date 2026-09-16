-- =============================================================================
-- DSI §3.4 — GRANT minimal par schéma (principe du moindre privilège)
-- Chaque user n'accède qu'à son propre schéma + l'historique Flyway dedans.
-- Aucun GRANT croisé entre services.
-- =============================================================================

DO $$
DECLARE
  pair record;
BEGIN
  FOR pair IN
    SELECT * FROM (VALUES
      ('app_user_auth',              'auth'),
      ('app_user_formation',         'formation'),
      ('app_user_besoinsformation',  'besoin'),
      ('app_user_evaluation',        'evaluation'),
      ('app_user_certificat',        'certificat'),
      ('app_user_competence',        'competence'),
      ('app_user_analyse',           'analyse'),
      ('app_user_notification',      'notification')
    ) AS t(role_name, schema_name)
  LOOP
    EXECUTE format('GRANT CONNECT ON DATABASE d2f TO %I',                 pair.role_name);
    EXECUTE format('GRANT USAGE  ON SCHEMA %I TO %I',                      pair.schema_name, pair.role_name);
    EXECUTE format('GRANT ALL    ON SCHEMA %I TO %I',                      pair.schema_name, pair.role_name);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES    TO %I', pair.schema_name, pair.role_name);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO %I', pair.schema_name, pair.role_name);
    -- Restreindre l'accès au schéma public
    EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', pair.role_name);
    -- Définir le search_path par défaut au schéma du service
    EXECUTE format('ALTER ROLE %I SET search_path TO %I, public', pair.role_name, pair.schema_name);
  END LOOP;
END $$;

-- =============================================================================
-- Permissions cross-schéma pour le service d'analyse prédictive
-- app_user_analyse lit en lecture seule dans tous les schémas métier
-- (requis pour les requêtes analytiques cross-service du moteur predictive)
-- =============================================================================
DO $$
DECLARE
  src_schema text;
BEGIN
  FOREACH src_schema IN ARRAY ARRAY['auth','formation','besoin','evaluation','certificat','competence']
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO app_user_analyse', src_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT ON TABLES TO app_user_analyse', src_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT ON SEQUENCES TO app_user_analyse', src_schema);
  END LOOP;
END $$;
