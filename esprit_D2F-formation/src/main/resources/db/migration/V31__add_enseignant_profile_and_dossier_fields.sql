-- =============================================================================
-- V31 : champs profil + suivi de dossier sur enseignants, pour la page de
--       gestion unifiée (comptes + enseignants) et le scope RESPONSABLE_DOSSIER.
--
-- - specialite        : spécialité académique (filtre/affichage)
-- - date_recrutement  : date d'embauche (filtre par plage de recrutement, tri)
-- - dossier_status    : état administratif du dossier (suivi RESPONSABLE_DOSSIER)
-- - dossier_last_update / dossier_notes : traçabilité du suivi de dossier
--
-- Indexes ajoutés pour les colonnes de filtrage/tri (DSI — perf < 200ms).
-- Idempotent (IF NOT EXISTS) pour rejouabilité sûre.
-- =============================================================================

-- 1. Champs métier additionnels
ALTER TABLE enseignants
    ADD COLUMN IF NOT EXISTS specialite          VARCHAR(150),
    ADD COLUMN IF NOT EXISTS date_recrutement    DATE,
    ADD COLUMN IF NOT EXISTS dossier_status      VARCHAR(30),
    ADD COLUMN IF NOT EXISTS dossier_last_update TIMESTAMP,
    ADD COLUMN IF NOT EXISTS dossier_notes       TEXT;

-- 2. Indexes pour filtrage / tri de la page unifiée
CREATE INDEX IF NOT EXISTS idx_enseignants_date_recrutement ON enseignants (date_recrutement);
CREATE INDEX IF NOT EXISTS idx_enseignants_grade            ON enseignants (grade);
CREATE INDEX IF NOT EXISTS idx_enseignants_etat             ON enseignants (etat);
CREATE INDEX IF NOT EXISTS idx_enseignants_dept_id          ON enseignants (dept_id);
CREATE INDEX IF NOT EXISTS idx_enseignants_up_id            ON enseignants (up_id);
CREATE INDEX IF NOT EXISTS idx_enseignants_dossier_status   ON enseignants (dossier_status);

-- 3. Recherche insensible à la casse sur nom / prénom (ILIKE) — indexes fonctionnels
CREATE INDEX IF NOT EXISTS idx_enseignants_lower_nom    ON enseignants (LOWER(nom));
CREATE INDEX IF NOT EXISTS idx_enseignants_lower_prenom ON enseignants (LOWER(prenom));
