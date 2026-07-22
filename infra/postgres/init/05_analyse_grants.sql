-- Grants pour app_user_analyse sur les schemas partages
-- Besoin d'acces en lecture sur besoin, competence, formation, evaluation, certificat, notification
-- pour que les requetes cross-schema du predictive-analytics fonctionnent.
-- NOTE: ALTER USER SET search_path ne supporte pas les noms a virgules dans une seule
-- instruction. On le definit dans 00_init_roles.sh via psql -v ou ici en dernier recours.
ALTER USER app_user_analyse SET search_path TO "analyse", "besoin", "competence", "formation", "evaluation", "certificat", "notification", "public";
GRANT USAGE ON SCHEMA besoin, competence, formation, evaluation, certificat, notification TO app_user_analyse;
GRANT SELECT ON ALL TABLES IN SCHEMA besoin TO app_user_analyse;
GRANT SELECT ON ALL TABLES IN SCHEMA competence TO app_user_analyse;
GRANT SELECT ON ALL TABLES IN SCHEMA formation TO app_user_analyse;
GRANT SELECT ON ALL TABLES IN SCHEMA evaluation TO app_user_analyse;
GRANT SELECT ON ALL TABLES IN SCHEMA certificat TO app_user_analyse;
GRANT SELECT ON ALL TABLES IN SCHEMA notification TO app_user_analyse;
ALTER DEFAULT PRIVILEGES IN SCHEMA besoin GRANT SELECT ON TABLES TO app_user_analyse;
ALTER DEFAULT PRIVILEGES IN SCHEMA competence GRANT SELECT ON TABLES TO app_user_analyse;
ALTER DEFAULT PRIVILEGES IN SCHEMA formation GRANT SELECT ON TABLES TO app_user_analyse;
ALTER DEFAULT PRIVILEGES IN SCHEMA evaluation GRANT SELECT ON TABLES TO app_user_analyse;
ALTER DEFAULT PRIVILEGES IN SCHEMA certificat GRANT SELECT ON TABLES TO app_user_analyse;
ALTER DEFAULT PRIVILEGES IN SCHEMA notification GRANT SELECT ON TABLES TO app_user_analyse;
