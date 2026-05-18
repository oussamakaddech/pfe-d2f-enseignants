-- =============================================================================
-- V1 Baseline Migration — auth-service
-- Tables créées initialement par spring.jpa.hibernate.ddl-auto=update.
-- À partir de V6, toutes les modifications passent par des scripts SQL versionnés.
-- Conformité DSI §3.2 : migrations obligatoires, aucune création manuelle.
-- =============================================================================

-- Rôles applicatifs (ERole enum : ADMIN, CUP, ENSEIGNANT, FORMATEUR, ...)
CREATE TABLE IF NOT EXISTS roles (
    id   SERIAL       PRIMARY KEY,
    name VARCHAR(20)  NOT NULL UNIQUE
);

-- Utilisateurs
-- Nota : failed_login_attempts et lock_until sont ajoutés en V13
CREATE TABLE IF NOT EXISTS users (
    id               VARCHAR(36)  NOT NULL PRIMARY KEY,
    username         VARCHAR(20)  NOT NULL UNIQUE,
    first_name       VARCHAR(255) NOT NULL,
    last_name        VARCHAR(255) NOT NULL,
    phone_number     VARCHAR(255) NOT NULL,
    disabled         BOOLEAN      NOT NULL DEFAULT false,
    discount         VARCHAR(255),
    has_subscription BOOLEAN      NOT NULL DEFAULT false,
    email            VARCHAR(50)  NOT NULL UNIQUE,
    password         VARCHAR(120) NOT NULL
);

-- Table de jointure utilisateurs ↔ rôles
CREATE TABLE IF NOT EXISTS user_roles (
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER     NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Appareils enregistrés par utilisateur (ElementCollection)
CREATE TABLE IF NOT EXISTS user_devices (
    user_id   VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255)
);
