-- =============================================================================
-- V23 — Index de performance pour besoin_formation (Fix 9)
-- =============================================================================
-- Justification DSI §3.5 — index obligatoires sur les colonnes de filtre/tri fréquents.
--
-- Colonnes indexées :
--   username       → filtrage par enseignant (recherche propre à un user)
--   up             → endpoint GET /by-up/{up}
--   departement    → endpoint GET /by-departement/{departement}
--   priorite       → endpoint GET /by-priorite + tri
--   approuve_cup   → filtre workflow niveau 1
--   approuve_chef_dep → filtre workflow niveau 2
--   approuve_admin → endpoint GET /approved + filtre workflow niveau 3
--   deleted_at     → filtre global @SQLRestriction("deleted_at IS NULL")
--   date_debut     → requêtes de planification temporelle
--   date_fin       → requêtes de planification temporelle
--
-- Note : les index partiels sur deleted_at IS NULL (Postgres) optimisent encore davantage
-- les requêtes courantes qui ignorent les enregistrements supprimés.
-- =============================================================================

-- ── Filtrage fréquent ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_besoin_username
    ON besoin_formation (username);

CREATE INDEX IF NOT EXISTS idx_besoin_up
    ON besoin_formation (up);

CREATE INDEX IF NOT EXISTS idx_besoin_departement
    ON besoin_formation (departement);

CREATE INDEX IF NOT EXISTS idx_besoin_priorite
    ON besoin_formation (priorite);

-- ── Workflow d'approbation ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_besoin_approuve_cup
    ON besoin_formation (approuve_cup);

CREATE INDEX IF NOT EXISTS idx_besoin_approuve_chef_dep
    ON besoin_formation (approuve_chef_dep);

CREATE INDEX IF NOT EXISTS idx_besoin_approuve_admin
    ON besoin_formation (approuve_admin);

-- ── Soft Delete (Fix 5) ───────────────────────────────────────────────────────
-- Index partiel PostgreSQL : couvre uniquement les enregistrements actifs (non supprimés).
-- Taille d'index minimale et performances optimales pour les SELECT courants.

CREATE INDEX IF NOT EXISTS idx_besoin_not_deleted
    ON besoin_formation (id_besoin_formation)
    WHERE deleted_at IS NULL;

-- Index direct sur deleted_at pour les requêtes d'administration (liste des supprimés)
CREATE INDEX IF NOT EXISTS idx_besoin_deleted_at
    ON besoin_formation (deleted_at);

-- ── Planification temporelle ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_besoin_date_debut
    ON besoin_formation (date_debut);

CREATE INDEX IF NOT EXISTS idx_besoin_date_fin
    ON besoin_formation (date_fin);

-- ── Index composé : filtrage courant UP + approuvé + non-supprimé ─────────────
-- Couvre le cas d'usage principal : "besoins approuvés de l'UP X actifs"

CREATE INDEX IF NOT EXISTS idx_besoin_up_approuve_admin
    ON besoin_formation (up, approuve_admin)
    WHERE deleted_at IS NULL;

-- ── Index composé : département + priorité (pour les rapports) ────────────────

CREATE INDEX IF NOT EXISTS idx_besoin_dept_priorite
    ON besoin_formation (departement, priorite)
    WHERE deleted_at IS NULL;
