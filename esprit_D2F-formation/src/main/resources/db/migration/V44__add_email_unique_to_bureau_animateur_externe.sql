-- V44 : unicité de l'email pour bureaux et animateurs externes.
--       Pas de soft-delete sur ces tables → contraintes FULL (pas partielles).

CREATE UNIQUE INDEX IF NOT EXISTS ux_bureaux_email
    ON bureaux (email);

CREATE UNIQUE INDEX IF NOT EXISTS ux_animateurs_externes_email
    ON animateurs_externes (email);
