#!/usr/bin/env bash
# =============================================================================
# DSI §3.4 — Bootstrap des rôles applicatifs PostgreSQL
# Exécuté automatiquement par l'image postgres:15-alpine au premier démarrage
# (volume vide). Lit les variables d'environnement DB_PASSWORD_* injectées
# par docker-compose et appelle les SQL templates avec psql -v.
#
# Les fichiers SQL sont volontairement hors de /docker-entrypoint-initdb.d/
# pour éviter qu'ils soient exécutés directement (sans substitution de variables).
# =============================================================================
set -euo pipefail

SQL_DIR="/opt/d2f/sql"

echo "[d2f-init] Creating per-service postgres roles and schemas..."

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -v "pwd_auth=${DB_PASSWORD_AUTH}" \
     -v "pwd_formation=${DB_PASSWORD_FORMATION}" \
     -v "pwd_besoin=${DB_PASSWORD_BESOIN}" \
     -v "pwd_evaluation=${DB_PASSWORD_EVALUATION}" \
     -v "pwd_certificat=${DB_PASSWORD_CERTIFICAT}" \
     -v "pwd_competence=${DB_PASSWORD_COMPETENCE}" \
     -v "pwd_analyse=${DB_PASSWORD_ANALYSE}" \
     -f "$SQL_DIR/01_create_roles.sql"

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -f "$SQL_DIR/02_grant_schemas.sql"

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -f "$SQL_DIR/03_extensions.sql"

echo "[d2f-init] Done."
