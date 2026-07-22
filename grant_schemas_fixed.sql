DO 
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
    EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', pair.role_name);
    EXECUTE format('ALTER ROLE %I SET search_path TO %I, public', pair.role_name, pair.schema_name);
  END LOOP;
END ;
