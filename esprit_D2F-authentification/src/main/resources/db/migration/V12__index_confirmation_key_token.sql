-- =============================================================================
-- V12 Index unique sur confirmation_key.token (hash SHA-256)
-- =============================================================================
-- A partir de cette version, la colonne `token` contient le HASH SHA-256 hex
-- du token de confirmation, non plus le token clair. Cette migration ajoute
-- un index unique pour accelerer les lookups par hash et detecter une
-- collision (rare mais previsible) avant insertion.
--
-- IMPORTANT : les tokens existants (en clair) restent fonctionnels jusqu'a
-- leur expiration (15 minutes max) puis sont purges par
-- ExpiredTokenPurgeScheduler. Aucune migration de donnees n'est requise.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_confirmation_key_token
    ON confirmation_key(token);
