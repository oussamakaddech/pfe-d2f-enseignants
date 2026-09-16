-- V26__add_indexes_formation.sql
-- =============================================================================
-- Database Indexes for Formation Service
-- Purpose: Improve query performance on frequently accessed columns
-- Author: DSI Team
-- Date: 2026-05-23
-- =============================================================================

-- =============================================================================
-- FORMATIONS TABLE INDEXES
-- =============================================================================

-- Index for filtering formations by state (workflow queries)
CREATE INDEX IF NOT EXISTS idx_formations_etat ON formations(etat_formation);

-- Index for filtering formations by type (internal/external)
CREATE INDEX IF NOT EXISTS idx_formations_type ON formations(type_formation);

-- Composite index for date range queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_formations_dates ON formations(date_debut, date_fin);

-- Index for linking to Besoin-Formation service (critical for event processing)
CREATE INDEX IF NOT EXISTS idx_formations_id_besoin ON formations(id_besoin_formation);

-- Index for soft delete queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_formations_deleted_at ON formations(deleted_at);

-- Composite index for common filter combination
CREATE INDEX IF NOT EXISTS idx_formations_up_dept ON formations(up_id, departement_id);

-- Index for formations with open inscriptions
CREATE INDEX IF NOT EXISTS idx_formations_inscriptions_ouvertes ON formations(inscriptions_ouvertes) WHERE inscriptions_ouvertes = true;

-- =============================================================================
-- INSCRIPTIONS TABLE INDEXES
-- =============================================================================

-- Index for finding inscriptions by formation
CREATE INDEX IF NOT EXISTS idx_inscriptions_formation ON inscriptions(formation_id);

-- Index for finding inscriptions by teacher
CREATE INDEX IF NOT EXISTS idx_inscriptions_enseignant ON inscriptions(enseignant_id);

-- Composite index for checking duplicate inscriptions
CREATE INDEX IF NOT EXISTS idx_inscriptions_unique ON inscriptions(formation_id, enseignant_id);

-- Index for filtering by inscription state
CREATE INDEX IF NOT EXISTS idx_inscriptions_etat ON inscriptions(etat);

-- =============================================================================
-- SEANCES FORMATIONS TABLE INDEXES
-- =============================================================================

-- Index for finding seances by formation
CREATE INDEX IF NOT EXISTS idx_seances_formation ON seances(formation_id);

-- Index for seance date queries
CREATE INDEX IF NOT EXISTS idx_seances_dates ON seances(date_seance, heure_debut);

-- =============================================================================
-- DOCUMENTS TABLE INDEXES
-- =============================================================================

-- Index for finding documents by formation
CREATE INDEX IF NOT EXISTS idx_documents_formation ON documents(formation_id);

-- Index for filtering documents by type
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(path_type);

-- =============================================================================
-- PRESENCES TABLE INDEXES
-- =============================================================================

-- Index for finding presences by seance
CREATE INDEX IF NOT EXISTS idx_presences_seance ON presences(seance_id);

-- Index for finding presences by teacher
CREATE INDEX IF NOT EXISTS idx_presences_enseignant ON presences(enseignant_id);

-- =============================================================================
-- FORMATION ANIMATEUR JOIN TABLE INDEXES
-- =============================================================================

-- Index for finding animateurs by formation (skip if table does not exist yet)
-- CREATE INDEX IF NOT EXISTS idx_formation_animateur_formation ON formation_animateur(formation_id);

-- Index for finding formations by animateur (skip if table does not exist yet)
-- CREATE INDEX IF NOT EXISTS idx_formation_animateur_enseignant ON formation_animateur(enseignant_id);

-- =============================================================================
-- ANALYZE TABLES AFTER INDEX CREATION
-- =============================================================================

-- Update statistics for query optimizer
ANALYZE formations;
ANALYZE inscriptions;
ANALYZE seances;
ANALYZE documents;
ANALYZE presences;