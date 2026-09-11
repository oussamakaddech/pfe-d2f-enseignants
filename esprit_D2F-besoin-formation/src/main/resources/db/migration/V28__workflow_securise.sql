-- =============================================================================
-- V28 — Workflow sécurisé des besoins de formation
--   1. Nouveaux champs workflow sur besoin_formation (créateur, étape, statut,
--      refus, validateurs) + reprise de l'existant depuis les flags approuve_*.
--   2. Table reviewer_scope : périmètre (UP / département) des validateurs,
--      administré côté serveur — source d'autorité pour le filtrage (jamais le
--      frontend). À renseigner par l'admin pour chaque CUP / chef.
--   3. Table besoin_approval_history : piste d'audit des transitions.
-- Conformité DSI §3.2 (IF NOT EXISTS → idempotent).
-- =============================================================================

-- ── 1. Colonnes workflow ────────────────────────────────────────────────────

ALTER TABLE besoin_formation
    ADD COLUMN IF NOT EXISTS created_by_user_id       VARCHAR(150),
    ADD COLUMN IF NOT EXISTS created_by_role          VARCHAR(20),
    ADD COLUMN IF NOT EXISTS current_approval_step    VARCHAR(20),
    ADD COLUMN IF NOT EXISTS status                   VARCHAR(25),
    ADD COLUMN IF NOT EXISTS rejection_reason         TEXT,
    ADD COLUMN IF NOT EXISTS rejected_by              VARCHAR(150),
    ADD COLUMN IF NOT EXISTS rejected_at              TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS approved_by_cup          VARCHAR(150),
    ADD COLUMN IF NOT EXISTS approved_by_chef_dep     VARCHAR(150),
    ADD COLUMN IF NOT EXISTS approved_by_admin        VARCHAR(150);

-- ── 2. Périmètres validateurs ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviewer_scope (
    username         VARCHAR(150) PRIMARY KEY,
    role             VARCHAR(30)  NOT NULL,
    up_code          VARCHAR(255),
    department_code  VARCHAR(255),
    CONSTRAINT chk_reviewer_scope_role CHECK (role IN ('CUP', 'CHEF_DEPARTEMENT'))
);

-- ── 3. Historique d'audit ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS besoin_approval_history (
    id             BIGSERIAL PRIMARY KEY,
    besoin_id      BIGINT       NOT NULL REFERENCES besoin_formation(id_besoin_formation),
    actor_username VARCHAR(150) NOT NULL,
    actor_role     VARCHAR(30)  NOT NULL,
    action         VARCHAR(20)  NOT NULL,
    from_step      VARCHAR(20),
    to_step        VARCHAR(20),
    reason         TEXT,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_besoin ON besoin_approval_history(besoin_id);

-- ── 4. Reprise de l'existant (heuristique documentée) ───────────────────────
-- created_by_role : le type COLLECTIF existant est attribué à CUP par défaut
-- (cas majoritaire) ; INDIVIDUEL / ANIMER_UNE_FORMATION / NULL → ENSEIGNANT.
-- L'admin peut corriger via les endpoints reviewer-scopes / history.

UPDATE besoin_formation
SET created_by_role = CASE
        WHEN type_besoin = 'COLLECTIF' THEN 'CUP'
        ELSE 'ENSEIGNANT'
    END
WHERE created_by_role IS NULL;

-- Refus explicite (un flag à false) → REJECTED.
UPDATE besoin_formation
SET status = 'REJECTED',
    current_approval_step = 'REJECTED'
WHERE status IS NULL
  AND (approuve_cup = FALSE OR approuve_chef_dep = FALSE OR approuve_admin = FALSE);

-- Chaîne d'approbation complète.
UPDATE besoin_formation
SET status = CASE WHEN event_published = TRUE THEN 'FORMATION_CREATED' ELSE 'ADMIN_APPROVED' END,
    current_approval_step = CASE WHEN event_published = TRUE THEN 'COMPLETED' ELSE 'ADMIN' END
WHERE status IS NULL AND approuve_admin = TRUE;

UPDATE besoin_formation
SET status = 'DEPARTMENT_APPROVED',
    current_approval_step = 'ADMIN'
WHERE status IS NULL AND approuve_chef_dep = TRUE;

UPDATE besoin_formation
SET status = 'CUP_APPROVED',
    current_approval_step = 'CHEF_DEPARTEMENT'
WHERE status IS NULL AND approuve_cup = TRUE;

-- Aucune validation : point d'entrée selon le type.
UPDATE besoin_formation
SET status = 'SUBMITTED',
    current_approval_step = CASE WHEN type_besoin = 'COLLECTIF' THEN 'CHEF_DEPARTEMENT' ELSE 'CUP' END
WHERE status IS NULL;
