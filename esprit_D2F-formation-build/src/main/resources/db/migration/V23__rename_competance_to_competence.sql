-- DSI §1.2 — Correction typo : renommage colonne competance → competence
-- La colonne était mal orthographiée depuis V1__baseline.sql.
ALTER TABLE formation.formations
    RENAME COLUMN competance TO competence;
