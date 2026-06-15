-- DSI §4 — Soft delete : ajout de la colonne deleted_at sur evaluation_globale
ALTER TABLE evaluation.evaluation_globale
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
