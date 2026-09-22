#!/usr/bin/env bash
# =====================================================================
# D2F — création des rôles applicatifs Postgres (DSI §3.4)
# =====================================================================
#
# Exécuté par l'image officielle postgres au PREMIER démarrage d'une base
# vierge (docker-entrypoint-initdb.d). Sur une base déjà initialisée il n'est
# pas relancé : pour réappliquer le modèle de droits sans recréer la base,
# lancer manuellement
#
#     docker exec d2f-postgres bash /docker-entrypoint-initdb.d/00_init_roles.sh
#
# Le script est idempotent, ce rejeu est donc sans risque.
#
# POURQUOI IL EST VERSIONNÉ
# -------------------------
# docker-compose.yml le monte et le référence depuis toujours, mais `infra/`
# était gitignoré : le fichier n'existait que sur la machine qui avait créé la
# base. Un clone neuf démarrait une base SANS rôles applicatifs, et chaque
# service échouait à se connecter. Le 2026-09-22, l'absence d'un seul droit
# (USAGE sur `competence` pour app_user_formation) a suffi à bloquer le
# démarrage de formation, puis de gateway, webapp et analyse par dépendance.
#
# Les mots de passe viennent de l'environnement (DB_PASSWORD_* fournis par
# docker-compose depuis .env) et ne sont jamais écrits dans le dépôt. À défaut
# d'un mot de passe par service, DB_PASSWORD sert de repli — pratique en
# développement, à éviter en production.
# =====================================================================
set -euo pipefail

: "${POSTGRES_USER:?POSTGRES_USER manquant}"
: "${POSTGRES_DB:?POSTGRES_DB manquant}"

SQL_DIR="${D2F_SQL_DIR:-/opt/d2f/sql}"

# Rôle:variable de mot de passe. L'ordre n'a pas d'importance.
ROLES=(
  "app_user_auth:DB_PASSWORD_AUTH"
  "app_user_competence:DB_PASSWORD_COMPETENCE"
  "app_user_formation:DB_PASSWORD_FORMATION"
  "app_user_evaluation:DB_PASSWORD_EVALUATION"
  "app_user_certificat:DB_PASSWORD_CERTIFICAT"
  "app_user_besoinsformation:DB_PASSWORD_BESOIN"
  "app_user_analyse:DB_PASSWORD_ANALYSE"
  "app_user_notification:DB_PASSWORD_NOTIFICATION"
  "app_user_rice:DB_PASSWORD_RICE"
)

psql_super() {
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" "$@"
}

echo "[d2f-init] création des rôles applicatifs"
for entry in "${ROLES[@]}"; do
  role="${entry%%:*}"
  pass_var="${entry##*:}"
  # Repli sur DB_PASSWORD si le mot de passe dédié n'est pas fourni.
  password="${!pass_var:-${DB_PASSWORD:-}}"
  if [ -z "$password" ]; then
    echo "[d2f-init] ERREUR : ni $pass_var ni DB_PASSWORD ne sont définis pour $role" >&2
    exit 1
  fi

  # CREATE ROLE n'a pas d'IF NOT EXISTS : on teste avant, et on réaligne le
  # mot de passe au rejeu (rotation de secret sans recréer la base).
  psql_super <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN
    CREATE ROLE ${role} LOGIN PASSWORD '${password}';
  ELSE
    ALTER ROLE ${role} LOGIN PASSWORD '${password}';
  END IF;
END
\$\$;
GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${role};
SQL
  echo "[d2f-init]   - ${role}"
done

# Les schémas et les droits inter-services vivent dans un SQL dédié, versionné
# lui aussi : c'est la seule source de vérité du modèle de droits.
GRANTS_SQL="${SQL_DIR}/10_schemas_and_grants.sql"
if [ -f "$GRANTS_SQL" ]; then
  echo "[d2f-init] application des schémas et droits (${GRANTS_SQL})"
  psql_super -f "$GRANTS_SQL"
else
  echo "[d2f-init] ATTENTION : ${GRANTS_SQL} introuvable — droits inter-schémas NON appliqués." >&2
  echo "[d2f-init] Vérifier le montage ./infra/postgres/sql:/opt/d2f/sql du docker-compose." >&2
  exit 1
fi

echo "[d2f-init] terminé"
