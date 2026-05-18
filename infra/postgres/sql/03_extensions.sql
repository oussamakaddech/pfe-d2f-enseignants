-- =============================================================================
-- DSI §3.4 — Extensions PostgreSQL créées par le superuser
-- pgcrypto : requis par auth-service V6__Add_admin_user.sql (crypt/gen_salt)
-- CREATE EXTENSION nécessite SUPERUSER — ne peut pas être exécuté par app_user_*
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
