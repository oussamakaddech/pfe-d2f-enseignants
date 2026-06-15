-- DSI §4 — Soft delete : ajout de la colonne deleted_at sur certificates
ALTER TABLE certificat.certificates
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
