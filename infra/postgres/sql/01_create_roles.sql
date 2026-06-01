-- =============================================================================
-- DSI §3.4 — Isolation des utilisateurs PostgreSQL par service
-- Convention : un rôle "app_user_{service}" par microservice
-- Les mots de passe sont injectés via psql -v par 00_init_roles.sh
-- Ce fichier n'est exécuté qu'au premier démarrage du conteneur (DB vierge),
-- donc CREATE ROLE sans IF NOT EXISTS est sûr.
-- =============================================================================

CREATE ROLE app_user_auth              LOGIN PASSWORD :'pwd_auth';
CREATE ROLE app_user_formation         LOGIN PASSWORD :'pwd_formation';
CREATE ROLE app_user_besoinsformation  LOGIN PASSWORD :'pwd_besoin';
CREATE ROLE app_user_evaluation        LOGIN PASSWORD :'pwd_evaluation';
CREATE ROLE app_user_certificat        LOGIN PASSWORD :'pwd_certificat';
CREATE ROLE app_user_competence        LOGIN PASSWORD :'pwd_competence';
CREATE ROLE app_user_analyse           LOGIN PASSWORD :'pwd_analyse';

-- Schémas dédiés (ownership donnée au rôle applicatif)
CREATE SCHEMA IF NOT EXISTS auth       AUTHORIZATION app_user_auth;
CREATE SCHEMA IF NOT EXISTS formation  AUTHORIZATION app_user_formation;
CREATE SCHEMA IF NOT EXISTS besoin     AUTHORIZATION app_user_besoinsformation;
CREATE SCHEMA IF NOT EXISTS evaluation AUTHORIZATION app_user_evaluation;
CREATE SCHEMA IF NOT EXISTS certificat AUTHORIZATION app_user_certificat;
CREATE SCHEMA IF NOT EXISTS competence AUTHORIZATION app_user_competence;
CREATE SCHEMA IF NOT EXISTS "analyse" AUTHORIZATION app_user_analyse;
