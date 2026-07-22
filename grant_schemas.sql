GRANT CONNECT ON DATABASE d2f TO app_user_auth;
GRANT USAGE ON SCHEMA auth TO app_user_auth;
GRANT ALL ON SCHEMA auth TO app_user_auth;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO app_user_auth;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO app_user_auth;
REVOKE ALL ON SCHEMA public FROM app_user_auth;
ALTER ROLE app_user_auth SET search_path TO auth, public;

GRANT CONNECT ON DATABASE d2f TO app_user_formation;
GRANT USAGE ON SCHEMA formation TO app_user_formation;
GRANT ALL ON SCHEMA formation TO app_user_formation;
ALTER DEFAULT PRIVILEGES IN SCHEMA formation GRANT ALL ON TABLES TO app_user_formation;
ALTER DEFAULT PRIVILEGES IN SCHEMA formation GRANT ALL ON SEQUENCES TO app_user_formation;
REVOKE ALL ON SCHEMA public FROM app_user_formation;
ALTER ROLE app_user_formation SET search_path TO formation, public;

GRANT CONNECT ON DATABASE d2f TO app_user_besoinsformation;
GRANT USAGE ON SCHEMA besoin TO app_user_besoinsformation;
GRANT ALL ON SCHEMA besoin TO app_user_besoinsformation;
ALTER DEFAULT PRIVILEGES IN SCHEMA besoin GRANT ALL ON TABLES TO app_user_besoinsformation;
ALTER DEFAULT PRIVILEGES IN SCHEMA besoin GRANT ALL ON SEQUENCES TO app_user_besoinsformation;
REVOKE ALL ON SCHEMA public FROM app_user_besoinsformation;
ALTER ROLE app_user_besoinsformation SET search_path TO besoin, public;

GRANT CONNECT ON DATABASE d2f TO app_user_evaluation;
GRANT USAGE ON SCHEMA evaluation TO app_user_evaluation;
GRANT ALL ON SCHEMA evaluation TO app_user_evaluation;
ALTER DEFAULT PRIVILEGES IN SCHEMA evaluation GRANT ALL ON TABLES TO app_user_evaluation;
ALTER DEFAULT PRIVILEGES IN SCHEMA evaluation GRANT ALL ON SEQUENCES TO app_user_evaluation;
REVOKE ALL ON SCHEMA public FROM app_user_evaluation;
ALTER ROLE app_user_evaluation SET search_path TO evaluation, public;

GRANT CONNECT ON DATABASE d2f TO app_user_certificat;
GRANT USAGE ON SCHEMA certificat TO app_user_certificat;
GRANT ALL ON SCHEMA certificat TO app_user_certificat;
ALTER DEFAULT PRIVILEGES IN SCHEMA certificat GRANT ALL ON TABLES TO app_user_certificat;
ALTER DEFAULT PRIVILEGES IN SCHEMA certificat GRANT ALL ON SEQUENCES TO app_user_certificat;
REVOKE ALL ON SCHEMA public FROM app_user_certificat;
ALTER ROLE app_user_certificat SET search_path TO certificat, public;

GRANT CONNECT ON DATABASE d2f TO app_user_competence;
GRANT USAGE ON SCHEMA competence TO app_user_competence;
GRANT ALL ON SCHEMA competence TO app_user_competence;
ALTER DEFAULT PRIVILEGES IN SCHEMA competence GRANT ALL ON TABLES TO app_user_competence;
ALTER DEFAULT PRIVILEGES IN SCHEMA competence GRANT ALL ON SEQUENCES TO app_user_competence;
REVOKE ALL ON SCHEMA public FROM app_user_competence;
ALTER ROLE app_user_competence SET search_path TO competence, public;

GRANT CONNECT ON DATABASE d2f TO app_user_analyse;
GRANT USAGE ON SCHEMA "analyse" TO app_user_analyse;
GRANT ALL ON SCHEMA "analyse" TO app_user_analyse;
ALTER DEFAULT PRIVILEGES IN SCHEMA "analyse" GRANT ALL ON TABLES TO app_user_analyse;
ALTER DEFAULT PRIVILEGES IN SCHEMA "analyse" GRANT ALL ON SEQUENCES TO app_user_analyse;
REVOKE ALL ON SCHEMA public FROM app_user_analyse;
ALTER ROLE app_user_analyse SET search_path TO "analyse", public;

GRANT CONNECT ON DATABASE d2f TO app_user_notification;
GRANT USAGE ON SCHEMA notification TO app_user_notification;
GRANT ALL ON SCHEMA notification TO app_user_notification;
ALTER DEFAULT PRIVILEGES IN SCHEMA notification GRANT ALL ON TABLES TO app_user_notification;
ALTER DEFAULT PRIVILEGES IN SCHEMA notification GRANT ALL ON SEQUENCES TO app_user_notification;
REVOKE ALL ON SCHEMA public FROM app_user_notification;
ALTER ROLE app_user_notification SET search_path TO notification, public;