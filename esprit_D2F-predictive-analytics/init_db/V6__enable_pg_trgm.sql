-- ============================================================
-- V6 — Enable pg_trgm extension for fuzzy text matching
-- ============================================================
-- Utilisé par BESOIN_DEMAND_QUERY_PGTRGM dans data_service.py pour
-- matcher les besoins de formation aux compétences via similarité
-- de n-grammes. Sans cette extension, le service tombe sur le fallback
-- ILIKE tokenisé, beaucoup moins précis.
-- Nécessite des droits SUPERUSER sur la base.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
