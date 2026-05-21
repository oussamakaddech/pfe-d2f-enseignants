-- V20: création de la table bureaux (gestion des bureaux externes)
CREATE TABLE IF NOT EXISTS formation.bureaux (
    id                BIGSERIAL       PRIMARY KEY,
    nom               VARCHAR(255)    NOT NULL,
    email             VARCHAR(255)    NOT NULL,
    numero_telephone  VARCHAR(50)     NOT NULL
);
