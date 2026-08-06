-- =============================================================================
-- V25 — Renommage de la table de notifications interne du besoin-formation
-- Audit DSI (F21) : la table "notification" portait le même nom que
-- "notification".notification du service de notifications dédié, créant une
-- ambiguïté (schéma besoin via search_path vs schéma dédié).
-- Renommée en "besoin_formation_notification" : fonctionnalité inchangée
-- (création à l'approbation, consultation /besoins-formation/notifications).
-- =============================================================================

ALTER TABLE IF EXISTS notification RENAME TO besoin_formation_notification;
ALTER INDEX IF EXISTS notification_pkey RENAME TO besoin_formation_notification_pkey;
