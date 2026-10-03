-- V29 — les rattachements UP / département des enseignants sont également
-- résolus côté serveur lors de la création d'un besoin individuel.
ALTER TABLE reviewer_scope DROP CONSTRAINT IF EXISTS chk_reviewer_scope_role;
ALTER TABLE reviewer_scope
    ADD CONSTRAINT chk_reviewer_scope_role
    CHECK (role IN ('CUP', 'CHEF_DEPARTEMENT', 'ENSEIGNANT'));

CREATE INDEX IF NOT EXISTS idx_reviewer_scope_role
    ON reviewer_scope (role);