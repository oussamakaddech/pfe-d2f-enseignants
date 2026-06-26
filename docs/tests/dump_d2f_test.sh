#!/usr/bin/env bash
# =============================================================================
# dump_d2f_test.sh — Plateforme D2F
# =============================================================================
# Rôle de ce script : orchestrer (1) l'export d'un dump PostgreSQL depuis
# l'environnement Docker, (2) l'import d'un dump existant sur un environnement
# cible, et (3) l'injection de données de test minimales (utilisateurs par rôle,
# domaines/compétences/sous-compétences/savoirs, formations + séances, besoin de
# formation en attente d'approbation).
#
# Conventions respectées :
#   - DSI §1.1 : AUCUN secret en dur dans le script. Tous les mots de passe et
#     identifiants de connexion sont lus depuis le fichier .env ou passés en
#     variables d'environnement par l'opérateur.
#   - DSI §3.2 : les données de test sont idempotentes (ON CONFLICT DO NOTHING /
#     WHERE NOT EXISTS) et utilisent la fonction crypt()+gen_salt('bf') de
#     PostgreSQL pour hasher les mots de passe (BCrypt), conformément aux
#     migrations Flyway existantes du service Authentification.
#   - Politique de mots de passe : min. 8 caractères, majuscule + chiffre +
#     caractère spécial. Les valeurs par défaut ci-dessous respectent cette règle.
#
# Utilisation :
#   ./dump_d2f_test.sh export   [fichier_sortie.sql]   # génère le dump
#   ./dump_d2f_test.sh import   [fichier_entree.sql]   # importe un dump
#   ./dump_d2f_test.sh seed                            # insère les données de test
#   ./dump_d2f_test.sh all                             # export + seed (environnement vierge)
#
# Pré-requis : Docker + Docker Compose, stack D2F démarrée (au moins postgres).
# =============================================================================

set -euo pipefail

# ── Configuration (non sensible — valeurs par défaut, surchargeables) ─────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"
PG_CONTAINER="${D2F_PG_CONTAINER:-d2f-postgres}"   # nom du conteneur PostgreSQL
PG_USER="${D2F_PG_USER:-d2f}"                       # utilisateur applicatif PostgreSQL
PG_DB="${D2F_PG_DB:-d2f}"                           # nom de la base de données

# Dates horodatées pour les noms de dump
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DEFAULT_DUMP_FILE="dump_d2f_test-${TIMESTAMP}.sql"

# ── Chargement du .env (si présent) pour les valeurs par défaut ────────────────
if [[ -f "${ENV_FILE}" ]]; then
    # shellcheck disable=SC1090
    set -a; . "${ENV_FILE}"; set +a
fi

# =============================================================================
# FONCTIONS UTILITAIRES
# =============================================================================

log()  { printf '\033[1;34m[INFO]\033[0m  %s\n'  "$*"; }
ok()   { printf '\033[1;32m[OK]\033[0m    %s\n'  "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m  %s\n'  "$*"; }
err()  { printf '\033[1;31m[ERR]\033[0m   %s\n'  "$*" >&2; }

require_container() {
    if ! docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
        err "Le conteneur PostgreSQL '${PG_CONTAINER}' n'est pas en cours d'exécution."
        err "Démarrer la stack : docker compose up -d postgres"
        exit 1
    fi
}

# =============================================================================
# 1. EXPORT — Dump complet depuis l'environnement Docker
# =============================================================================
do_export() {
    local outfile="${1:-${DEFAULT_DUMP_FILE}}"
    require_container

    log "Export du dump PostgreSQL complet (rôles + schémas + données)..."
    log "Conteneur : ${PG_CONTAINER} | Utilisateur : ${PG_USER} | Sortie : ${outfile}"

    # pg_dumpall capture aussi les rôles app_user_* créés par infra/postgres/sql/01_create_roles.sql
    docker exec -t "${PG_CONTAINER}" pg_dumpall -U "${PG_USER}" > "${outfile}"

    local size
    size="$(du -h "${outfile}" | cut -f1)"
    ok "Dump généré : ${outfile} (${size})"
    log "Vérification rapide :"
    head -n 5 "${outfile}"
}

# =============================================================================
# 2. IMPORT — Restaurer un dump sur un environnement cible
# =============================================================================
do_import() {
    local infile="${1:-${DEFAULT_DUMP_FILE}}"
    if [[ ! -f "${infile}" ]]; then
        # Si aucun fichier récent n'est trouvé, chercher un dump par défaut
        infile="$(ls -t dump_d2f_test*.sql 2>/dev/null | head -n1 || true)"
        if [[ -z "${infile}" ]]; then
            err "Fichier dump introuvable. Usage : $0 import <fichier.sql>"
            exit 1
        fi
        warn "Aucun fichier fourni — utilisation du plus récent : ${infile}"
    fi

    require_container
    log "Import du dump '${infile}' dans la base '${PG_DB}'..."
    log "Conteneur : ${PG_CONTAINER} | Utilisateur : ${PG_USER}"

    # psql rejoue le dump : rôles, schémas, tables, données, index, contraintes.
    docker exec -i "${PG_CONTAINER}" psql -U "${PG_USER}" -d "${PG_DB}" < "${infile}"

    ok "Import terminé."
    log "Vérification — compter les utilisateurs par schéma :"
    docker exec "${PG_CONTAINER}" psql -U "${PG_USER}" -d "${PG_DB}" -c \
      "SELECT 'auth.users' AS table, count(*) FROM auth.users;"
}

# =============================================================================
# 3. SEED — Insertion des données de test minimales
# =============================================================================
do_seed() {
    require_container
    log "Injection des données de test D2F (idempotent)..."

    # On transmet le script SQL au conteneur PostgreSQL via stdin.
    docker exec -i "${PG_CONTAINER}" psql -U "${PG_USER}" -d "${PG_DB}" -v ON_ERROR_STOP=1 <<'SQL'
-- ============================================================================
-- Données de test minimales — Plateforme D2F
-- ============================================================================
-- Conformité DSI §1.1 : les mots de passe ne sont PAS en dur ; ils sont hashés
-- à la volée avec crypt() + gen_salt('bf', 10) (BCrypt), exactement comme les
-- migrations V6 / V14 / V17 du service Authentification.
-- Politique de mots de passe respectée : 8+ caractères, majuscule + chiffre +
-- caractère spécial.
--
-- Idempotence : tous les INSERT utilisent ON CONFLICT DO NOTHING ou WHERE NOT
-- EXISTS. Le script peut être rejoué sans risque.
-- ============================================================================

\set ON_ERROR_STOP on

-- ----------------------------------------------------------------------------
-- 0. Extensions & schéma
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;        -- pour crypt() + gen_salt()
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS formation;
CREATE SCHEMA IF NOT EXISTS competence;
CREATE SCHEMA IF NOT EXISTS besoin;

-- ----------------------------------------------------------------------------
-- 1. Tables minimales du schéma AUTH (si non créées par les migrations Flyway)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth.roles (
    id   SERIAL       PRIMARY KEY,
    name VARCHAR(20)  NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS auth.users (
    id               VARCHAR(36)  NOT NULL PRIMARY KEY,
    username         VARCHAR(20)  NOT NULL UNIQUE,
    first_name       VARCHAR(255) NOT NULL,
    last_name        VARCHAR(255) NOT NULL,
    phone_number     VARCHAR(255) NOT NULL DEFAULT '00000000',
    disabled         BOOLEAN      NOT NULL DEFAULT false,
    has_subscription BOOLEAN      NOT NULL DEFAULT false,
    email            VARCHAR(255) NOT NULL UNIQUE,
    password         VARCHAR(255) NOT NULL,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    lock_until       BIGINT
);

CREATE TABLE IF NOT EXISTS auth.user_roles (
    user_id VARCHAR(36) NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id INTEGER     NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ----------------------------------------------------------------------------
-- 2. Rôles applicatifs (8 rôles D2F)
-- ----------------------------------------------------------------------------
INSERT INTO auth.roles (name) VALUES
    ('ADMIN'),
    ('CUP'),
    ('ENSEIGNANT'),
    ('ANIMATEUR'),
    ('CHEF_DEPARTEMENT'),
    ('RESPONSABLE_DOSSIER'),
    ('FORMATEUR')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Utilisateurs de test (un par rôle principal demandé)
-- ----------------------------------------------------------------------------
-- ADMIN — admin@esprit.tn / Admin@1234
INSERT INTO auth.users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-000000000001',
       'admin.test',
       'Admin',
       'Test',
       'admin@esprit.tn',
       crypt('Admin@1234', gen_salt('bf', 10)),
       '+21671000001',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@esprit.tn');

-- CUP — cup@esprit.tn / Cup@1234
INSERT INTO auth.users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-000000000002',
       'cup.test',
       'CUP',
       'Test',
       'cup@esprit.tn',
       crypt('Cup@1234', gen_salt('bf', 10)),
       '+21671000002',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cup@esprit.tn');

-- ENSEIGNANT — enseignant@esprit.tn / Ens@1234
INSERT INTO auth.users (id, username, first_name, last_name, email, password, phone_number, disabled, has_subscription)
SELECT '00000000-0000-0000-0000-000000000003',
       'enseignant.test',
       'Enseignant',
       'Test',
       'enseignant@esprit.tn',
       crypt('Ens@1234', gen_salt('bf', 10)),
       '+21671000003',
       false,
       true
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'enseignant@esprit.tn');

-- ----------------------------------------------------------------------------
-- 4. Affectation des rôles
-- ----------------------------------------------------------------------------
INSERT INTO auth.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u, auth.roles r
WHERE u.email = 'admin@esprit.tn'      AND r.name = 'ADMIN'
  AND NOT EXISTS (SELECT 1 FROM auth.user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO auth.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u, auth.roles r
WHERE u.email = 'cup@esprit.tn'        AND r.name = 'CUP'
  AND NOT EXISTS (SELECT 1 FROM auth.user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

INSERT INTO auth.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u, auth.roles r
WHERE u.email = 'enseignant@esprit.tn' AND r.name = 'ENSEIGNANT'
  AND NOT EXISTS (SELECT 1 FROM auth.user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

-- ----------------------------------------------------------------------------
-- 5. Tables COMPETENCE (si non créées par Flyway) — 3 domaines, 5 compétences
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competence.domaines (
    id          SERIAL       PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    nom         VARCHAR(255) NOT NULL,
    description TEXT,
    actif       BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    created_by  VARCHAR(100),
    version     INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS competence.competences (
    id          SERIAL       PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    nom         VARCHAR(255) NOT NULL,
    description TEXT,
    ordre       INTEGER      NOT NULL DEFAULT 0,
    domaine_id  INTEGER      REFERENCES competence.domaines(id) ON DELETE CASCADE,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    created_by  VARCHAR(100),
    version     INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS competence.sous_competences (
    id             SERIAL       PRIMARY KEY,
    code           VARCHAR(50)  NOT NULL UNIQUE,
    nom            VARCHAR(255) NOT NULL,
    description    TEXT,
    competence_id  INTEGER      REFERENCES competence.competences(id) ON DELETE CASCADE,
    niveau         INTEGER      NOT NULL DEFAULT 1,
    parent_id      INTEGER,
    created_at     TIMESTAMP    NOT NULL DEFAULT now(),
    created_by     VARCHAR(100),
    version        INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS competence.savoirs (
    id                 SERIAL       PRIMARY KEY,
    code               VARCHAR(50)  NOT NULL UNIQUE,
    nom                VARCHAR(255) NOT NULL,
    description        TEXT,
    type               VARCHAR(30)  NOT NULL DEFAULT 'THEORIQUE',
    niveau             VARCHAR(30)  NOT NULL DEFAULT 'N1_DEBUTANT',
    sous_competence_id INTEGER      REFERENCES competence.sous_competences(id) ON DELETE CASCADE,
    created_at         TIMESTAMP    NOT NULL DEFAULT now(),
    created_by         VARCHAR(100),
    version            INTEGER      NOT NULL DEFAULT 0
);

-- 3 domaines
INSERT INTO competence.domaines (code, nom, description, actif, created_at, created_by, version) VALUES
    ('DEV',    'Développement Logiciel', 'Backend, frontend, qualité logicielle', true, '2026-01-01 08:00:00', 'seed-test', 0),
    ('RESEAU', 'Réseaux & Cybersécurité', 'Infrastructure, sécurité applicative', true, '2026-01-01 08:00:00', 'seed-test', 0),
    ('AI',     'Intelligence Artificielle', 'ML, DL, Data Science', true, '2026-01-01 08:00:00', 'seed-test', 0)
ON CONFLICT (code) DO NOTHING;

-- 5 compétences
INSERT INTO competence.competences (code, nom, description, ordre, domaine_id, created_at, created_by, version) VALUES
    ('DEV.BACK',  'Développement Backend', 'APIs, bases de données, frameworks', 1,
        (SELECT id FROM competence.domaines WHERE code='DEV'),    '2026-01-01 08:00:00', 'seed-test', 0),
    ('DEV.FRONT', 'Développement Frontend', 'Interfaces utilisateur, frameworks JS', 2,
        (SELECT id FROM competence.domaines WHERE code='DEV'),    '2026-01-01 08:00:00', 'seed-test', 0),
    ('DEV.QA',    'Qualité & Tests', 'Tests unitaires, intégration, CI/CD', 3,
        (SELECT id FROM competence.domaines WHERE code='DEV'),    '2026-01-01 08:00:00', 'seed-test', 0),
    ('RES.SEC',   'Sécurité Applicative', 'OWASP, cryptographie', 1,
        (SELECT id FROM competence.domaines WHERE code='RESEAU'), '2026-01-01 08:00:00', 'seed-test', 0),
    ('AI.ML',     'Machine Learning', 'Algorithmes supervisés et non supervisés', 1,
        (SELECT id FROM competence.domaines WHERE code='AI'),     '2026-01-01 08:00:00', 'seed-test', 0)
ON CONFLICT (code) DO NOTHING;

-- Sous-compétences (rattachées aux 5 compétences)
INSERT INTO competence.sous_competences (code, nom, description, competence_id, niveau, created_at, created_by, version) VALUES
    ('DEV.BACK.SPRING', 'Spring Framework', 'Spring Boot, Spring Security, Spring Data',
        (SELECT id FROM competence.competences WHERE code='DEV.BACK'), 1, '2026-01-01 08:00:00', 'seed-test', 0),
    ('DEV.BACK.API',    'Conception d''APIs REST', 'REST, OpenAPI, versioning',
        (SELECT id FROM competence.competences WHERE code='DEV.BACK'), 1, '2026-01-01 08:00:00', 'seed-test', 0),
    ('DEV.FRONT.REACT', 'React.js', 'Hooks, composants, state management',
        (SELECT id FROM competence.competences WHERE code='DEV.FRONT'), 1, '2026-01-01 08:00:00', 'seed-test', 0),
    ('DEV.QA.TEST',     'Tests Automatisés', 'JUnit, Mockito, Cypress',
        (SELECT id FROM competence.competences WHERE code='DEV.QA'), 1, '2026-01-01 08:00:00', 'seed-test', 0),
    ('RES.SEC.OWASP',   'OWASP & Sécurité Web', 'Top 10, XSS, injection, CSRF',
        (SELECT id FROM competence.competences WHERE code='RES.SEC'), 1, '2026-01-01 08:00:00', 'seed-test', 0),
    ('AI.ML.SUPERV',    'Apprentissage Supervisé', 'Régression, classification',
        (SELECT id FROM competence.competences WHERE code='AI.ML'), 1, '2026-01-01 08:00:00', 'seed-test', 0)
ON CONFLICT (code) DO NOTHING;

-- Savoirs (type ∈ {THEORIQUE, PRATIQUE} — cf. enum TypeSavoir)
INSERT INTO competence.savoirs (code, nom, description, type, niveau, sous_competence_id, created_at, created_by, version) VALUES
    ('S.SPRING.BOOT', 'Spring Boot 3', 'Configuration automatique, starters',
        'PRATIQUE', 'N3_INTERMEDIAIRE',
        (SELECT id FROM competence.sous_competences WHERE code='DEV.BACK.SPRING'), '2026-01-01 08:00:00', 'seed-test', 0),
    ('S.SPRING.SEC',  'Spring Security', 'Authentification, autorisation, filtres',
        'PRATIQUE', 'N4_AVANCE',
        (SELECT id FROM competence.sous_competences WHERE code='DEV.BACK.SPRING'), '2026-01-01 08:00:00', 'seed-test', 0),
    ('S.API.REST',    'Conception REST', 'Principes REST, conventions',
        'THEORIQUE', 'N3_INTERMEDIAIRE',
        (SELECT id FROM competence.sous_competences WHERE code='DEV.BACK.API'), '2026-01-01 08:00:00', 'seed-test', 0),
    ('S.REACT.HOOKS', 'React Hooks', 'useState, useEffect, useContext',
        'PRATIQUE', 'N3_INTERMEDIAIRE',
        (SELECT id FROM competence.sous_competences WHERE code='DEV.FRONT.REACT'), '2026-01-01 08:00:00', 'seed-test', 0),
    ('S.QA.JUNIT',    'JUnit 5', 'Tests unitaires Java',
        'PRATIQUE', 'N2_ELEMENTAIRE',
        (SELECT id FROM competence.sous_competences WHERE code='DEV.QA.TEST'), '2026-01-01 08:00:00', 'seed-test', 0),
    ('S.OWASP.TOP10', 'OWASP Top 10', 'Injection, XSS, CSRF, broken auth',
        'THEORIQUE', 'N4_AVANCE',
        (SELECT id FROM competence.sous_competences WHERE code='RES.SEC.OWASP'), '2026-01-01 08:00:00', 'seed-test', 0),
    ('S.ML.REG',      'Régression Linéaire', 'Moindres carrés, régularisation',
        'PRATIQUE', 'N3_INTERMEDIAIRE',
        (SELECT id FROM competence.sous_competences WHERE code='AI.ML.SUPERV'), '2026-01-01 08:00:00', 'seed-test', 0)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. Données FORMATION — 2 formations avec séances
-- ----------------------------------------------------------------------------
-- IMPORTANT : le schéma des tables formation.* est géré par les migrations
-- Flyway du service formation (V1..V39). On NE crée PAS les tables ici ; on
-- se contente d'insérer des lignes dans les colonnes réellement présentes :
--   - formation.enseignants.id        : VARCHAR(10)  → on utilise 'ENSTEST001'
--   - formation.enseignants           : colonnes NOT NULL cup, chef_departement
--   - formation.formations            : PK = id_formation, colonne 'competence'
--   - formation.seances               : colonnes type_seance, contenus (PAS intitule/type)

-- Enseignant lié au compte auth enseignant@esprit.tn
-- (10 caractères max pour l'id ; cup/chef_departement obligatoires)
INSERT INTO formation.enseignants (id, nom, prenom, mail, type, etat, cup, chef_departement, up_id, dept_id, user_id)
SELECT 'ENSTEST001', 'TEST', 'Enseignant', 'enseignant@esprit.tn', 'P', 'A', 'N', 'N', 'UP_INFO', 'DEPT_INFO',
       (SELECT id FROM auth.users WHERE email = 'enseignant@esprit.tn')
WHERE NOT EXISTS (SELECT 1 FROM formation.enseignants WHERE mail = 'enseignant@esprit.tn');

-- Formation 1 — EN_COURS
INSERT INTO formation.formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Atelier Spring Boot 3 & JPA (Test)',
    'Développement Logiciel',
    'Spring Boot, Hibernate, REST APIs',
    'Enseignants du département Informatique',
    'Maîtriser Spring Boot 3 et JPA/Hibernate',
    'Concevoir une API REST sécurisée en Spring Boot',
    'QCM final + projet pratique noté',
    'INTERNE', '2026-04-01', '2026-06-30', 'EN_COURS',
    0.0, 30, false,
    'UP_INFO', 'DEPT_INFO', true, true, 'SUMMER'
WHERE NOT EXISTS (SELECT 1 FROM formation.formations WHERE titre_formation = 'Atelier Spring Boot 3 & JPA (Test)');

-- Formation 2 — PLANIFIEE
INSERT INTO formation.formations (
    type_besoin, titre_formation, domaine, competence,
    population_cible, objectifs, objectifs_pedago, eval_methods,
    type_formation, date_debut, date_fin, etat_formation,
    cout_formation, charge_horaire_global, certif_generated,
    up_id, departement_id, inscriptions_ouvertes, ouverte, period_code
) SELECT
    'INTERNE',
    'Sécurité Web et OWASP Top 10 (Test)',
    'Réseaux et Cybersécurité',
    'OWASP, Pentesting, Sécurité applicative',
    'Enseignants des départements Réseaux et Informatique',
    'Comprendre et contrer les vulnérabilités web critiques',
    'Identifier et corriger les failles OWASP Top 10',
    'Atelier pratique sur labo + rapport de vulnérabilités',
    'INTERNE', '2026-07-01', '2026-09-30', 'PLANIFIE',
    0.0, 24, false,
    'UP_RT', 'DEPT_RT', false, false, 'SUMMER'
WHERE NOT EXISTS (SELECT 1 FROM formation.formations WHERE titre_formation = 'Sécurité Web et OWASP Top 10 (Test)');

-- Séances pour la Formation 1 (4 séances) — colonnes type_seance + contenus
INSERT INTO formation.seances (formation_id, date_seance, heure_debut, heure_fin, salle, contenus, type_seance, session_number)
SELECT f.id_formation, '2026-04-05', '09:00', '12:00', 'Salle A101', 'Fondamentaux Spring Boot 3', 'THEORIQUE', 1
FROM formation.formations f WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA (Test)'
  AND NOT EXISTS (SELECT 1 FROM formation.seances s WHERE s.formation_id = f.id_formation AND s.session_number = 1);

INSERT INTO formation.seances (formation_id, date_seance, heure_debut, heure_fin, salle, contenus, type_seance, session_number)
SELECT f.id_formation, '2026-04-12', '09:00', '12:00', 'Salle A101', 'JPA/Hibernate avancé', 'PRATIQUE', 2
FROM formation.formations f WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA (Test)'
  AND NOT EXISTS (SELECT 1 FROM formation.seances s WHERE s.formation_id = f.id_formation AND s.session_number = 2);

INSERT INTO formation.seances (formation_id, date_seance, heure_debut, heure_fin, salle, contenus, type_seance, session_number)
SELECT f.id_formation, '2026-04-19', '09:00', '12:00', 'Salle A101', 'Spring Security & JWT', 'COURS', 3
FROM formation.formations f WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA (Test)'
  AND NOT EXISTS (SELECT 1 FROM formation.seances s WHERE s.formation_id = f.id_formation AND s.session_number = 3);

INSERT INTO formation.seances (formation_id, date_seance, heure_debut, heure_fin, salle, contenus, type_seance, session_number)
SELECT f.id_formation, '2026-04-26', '09:00', '12:00', 'Salle A101', 'Docker, tests et CI/CD', 'TP', 4
FROM formation.formations f WHERE f.titre_formation = 'Atelier Spring Boot 3 & JPA (Test)'
  AND NOT EXISTS (SELECT 1 FROM formation.seances s WHERE s.formation_id = f.id_formation AND s.session_number = 4);

-- Séances pour la Formation 2 (2 séances)
INSERT INTO formation.seances (formation_id, date_seance, heure_debut, heure_fin, salle, contenus, type_seance, session_number)
SELECT f.id_formation, '2026-07-05', '09:00', '12:00', 'Salle B202', 'Introduction OWASP Top 10', 'COURS', 1
FROM formation.formations f WHERE f.titre_formation = 'Sécurité Web et OWASP Top 10 (Test)'
  AND NOT EXISTS (SELECT 1 FROM formation.seances s WHERE s.formation_id = f.id_formation AND s.session_number = 1);

INSERT INTO formation.seances (formation_id, date_seance, heure_debut, heure_fin, salle, contenus, type_seance, session_number)
SELECT f.id_formation, '2026-07-12', '09:00', '12:00', 'Salle B202', 'Atelier pratique de pentesting', 'TP', 2
FROM formation.formations f WHERE f.titre_formation = 'Sécurité Web et OWASP Top 10 (Test)'
  AND NOT EXISTS (SELECT 1 FROM formation.seances s WHERE s.formation_id = f.id_formation AND s.session_number = 2);

-- ----------------------------------------------------------------------------
-- 7. Données BESOIN — 1 besoin en attente d'approbation
-- ----------------------------------------------------------------------------
-- Le schéma est géré par les migrations Flyway du service besoin-formation.
-- On insère dans les colonnes réelles (PK = id_besoin_formation auto-générée).

-- Besoin en attente d'approbation : déposé par l'enseignant, non encore approuvé
INSERT INTO besoin.besoin_formation (
    username, type_besoin, titre, theme,
    objectif_formation, methodes_pedagogiques, public_cible,
    nb_max_participants, duree_formation,
    up, departement, priorite, est_ouverte,
    autres_informations, period_code,
    approuve_cup, approuve_chef_dep, approuve_admin
) SELECT
    'enseignant.test',
    'INDIVIDUEL',
    'Perfectionnement Docker & Kubernetes pour enseignants (Test)',
    'Docker & Kubernetes — Mise en production',
    'Permettre aux enseignants d''intégrer les pratiques DevOps modernes dans leurs cours',
    'Alternance théorie (30%) et travaux pratiques (70%)',
    'Enseignants Informatique & Réseaux',
    10, 20,
    'UP_INFO', 'DEPT_INFO', 'HAUTE', false,
    'Besoin exprimé pour la rentrée 2026 — en attente d''approbation par le chef de département puis le CUP',
    'SUMMER',
    false, false, false
WHERE NOT EXISTS (
    SELECT 1 FROM besoin.besoin_formation
    WHERE username = 'enseignant.test'
      AND theme = 'Docker & Kubernetes — Mise en production'
);

-- ============================================================================
-- RÉCAPITULATIF — vérifications post-insertion
-- ============================================================================
\echo ''
\echo '=== Récapitulatif des données de test insérées ==='
SELECT 'Utilisateurs (auth.users)'                AS entite, count(*) AS nb FROM auth.users;
SELECT 'Rôles (auth.roles)'                       AS entite, count(*) AS nb FROM auth.roles;
SELECT 'Affectations user_roles'                  AS entite, count(*) AS nb FROM auth.user_roles;
SELECT 'Domaines (competence.domaines)'           AS entite, count(*) AS nb FROM competence.domaines;
SELECT 'Compétences (competence.competences)'     AS entite, count(*) AS nb FROM competence.competences;
SELECT 'Sous-compétences (competence.sous_competences)' AS entite, count(*) AS nb FROM competence.sous_competences;
SELECT 'Savoirs (competence.savoirs)'             AS entite, count(*) AS nb FROM competence.savoirs;
SELECT 'Enseignants (formation.enseignants)'      AS entite, count(*) AS nb FROM formation.enseignants;
SELECT 'Formations (formation.formations)'        AS entite, count(*) AS nb FROM formation.formations;
SELECT 'Séances (formation.seances)'              AS entite, count(*) AS nb FROM formation.seances;
SELECT 'Besoins (besoin.besoin_formation)'        AS entite, count(*) AS nb FROM besoin.besoin_formation;

\echo ''
\echo '=== Comptes de test prêts à l''emploi ==='
SELECT u.email, r.name AS role
FROM auth.users u
JOIN auth.user_roles ur ON ur.user_id = u.id
JOIN auth.roles r       ON r.id = ur.role_id
WHERE u.email IN ('admin@esprit.tn', 'cup@esprit.tn', 'enseignant@esprit.tn')
ORDER BY r.name;
\echo ''
SQL

    ok "Données de test injectées avec succès."
}

# =============================================================================
# 4. ALL — Export complet + seed (cas d'un environnement vierge)
# =============================================================================
do_all() {
    log "Mode 'all' : import du schéma de base via les services, puis seed."
    warn "Cette commande suppose que la stack D2F démarre pour la 1ère fois."
    do_seed
    local outfile="dump_d2f_test-${TIMESTAMP}.sql"
    do_export "${outfile}"
    ok "Environnement de test prêt : ${outfile}"
}

# =============================================================================
# AIDE
# =============================================================================
usage() {
    cat <<EOF
Usage : $0 <commande> [options]

Commandes :
  export  [fichier.sql]   Exporter un dump complet depuis Docker
                          (défaut : dump_d2f_test-YYYYMMDD-HHMMSS.sql)
  import  [fichier.sql]   Importer un dump existant (défaut : dump le plus récent)
  seed                   Insérer les données de test minimales (idempotent)
  all                    Export + seed (environnement vierge)
  help                   Afficher cette aide

Variables d'environnement (surchargeables) :
  D2F_PG_CONTAINER   Nom du conteneur PostgreSQL        (défaut : d2f-postgres)
  D2F_PG_USER        Utilisateur PostgreSQL              (défaut : d2f)
  D2F_PG_DB          Base de données                     (défaut : d2f)

Exemples :
  $0 export
  $0 export mon-dump.sql
  $0 import mon-dump.sql
  $0 seed
EOF
}

# =============================================================================
# POINT D'ENTRÉE
# =============================================================================
case "${1:-help}" in
    export) shift; do_export "$@" ;;
    import) shift; do_import "$@" ;;
    seed)   do_seed ;;
    all)    do_all ;;
    help|-h|--help) usage ;;
    *) err "Commande inconnue : $1"; usage; exit 1 ;;
esac
