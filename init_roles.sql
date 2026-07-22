CREATE ROLE app_user_auth              LOGIN PASSWORD 'd2fpasswd';
CREATE ROLE app_user_formation         LOGIN PASSWORD 'd2fpasswd';
CREATE ROLE app_user_besoinsformation  LOGIN PASSWORD 'd2fpasswd';
CREATE ROLE app_user_evaluation        LOGIN PASSWORD 'd2fpasswd';
CREATE ROLE app_user_certificat        LOGIN PASSWORD 'd2fpasswd';
CREATE ROLE app_user_competence        LOGIN PASSWORD 'd2fpasswd';
CREATE ROLE app_user_analyse           LOGIN PASSWORD 'd2fpasswd';
CREATE ROLE app_user_notification      LOGIN PASSWORD 'd2fpasswd';

CREATE SCHEMA IF NOT EXISTS auth       AUTHORIZATION app_user_auth;
CREATE SCHEMA IF NOT EXISTS formation  AUTHORIZATION app_user_formation;
CREATE SCHEMA IF NOT EXISTS besoin     AUTHORIZATION app_user_besoinsformation;
CREATE SCHEMA IF NOT EXISTS evaluation AUTHORIZATION app_user_evaluation;
CREATE SCHEMA IF NOT EXISTS certificat AUTHORIZATION app_user_certificat;
CREATE SCHEMA IF NOT EXISTS competence AUTHORIZATION app_user_competence;
CREATE SCHEMA IF NOT EXISTS "analyse"  AUTHORIZATION app_user_analyse;
CREATE SCHEMA IF NOT EXISTS notification AUTHORIZATION app_user_notification;

GRANT ALL PRIVILEGES ON DATABASE d2f TO app_user_auth;
GRANT ALL PRIVILEGES ON DATABASE d2f TO app_user_formation;
GRANT ALL PRIVILEGES ON DATABASE d2f TO app_user_besoinsformation;
GRANT ALL PRIVILEGES ON DATABASE d2f TO app_user_evaluation;
GRANT ALL PRIVILEGES ON DATABASE d2f TO app_user_certificat;
GRANT ALL PRIVILEGES ON DATABASE d2f TO app_user_competence;
GRANT ALL PRIVILEGES ON DATABASE d2f TO app_user_analyse;
GRANT ALL PRIVILEGES ON DATABASE d2f TO app_user_notification;
