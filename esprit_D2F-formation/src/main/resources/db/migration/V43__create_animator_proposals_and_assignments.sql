-- =============================================================================
-- V43 — Workflow propositions et affectations d'animateurs
-- =============================================================================
-- Deux tables :
--   1. animator_proposals  : propositions (manager ou auto-proposition)
--   2. formation_animators  : affectations définitives (après validation)
--
-- Règles métier :
--   - une auto-proposition ne crée JAMAIS automatiquement une affectation ;
--   - un seul LEAD_TRAINER actif par formation (contrainte applicative) ;
--   - unicité partielle par statut non terminal (contrainte applicative,
--     PostgreSQL ne supportant pas les index partiels via Hibernate).
-- =============================================================================

-- ── 1. Propositions d'animation ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS formation.animator_proposals (
    id               BIGSERIAL PRIMARY KEY,
    formation_id     BIGINT       NOT NULL,
    proposer_id      VARCHAR(50)  NOT NULL,
    proposer_type    VARCHAR(30)  NOT NULL,
    proposal_type    VARCHAR(30)  NOT NULL,
    role             VARCHAR(30)  NOT NULL,
    status           VARCHAR(30)  NOT NULL,
    motivation       VARCHAR(2000),
    proposed_by      VARCHAR(150),
    proposed_at      TIMESTAMP    NOT NULL,
    responded_at     TIMESTAMP,
    validated_by     VARCHAR(150),
    validated_at     TIMESTAMP,
    rejection_reason VARCHAR(1000),
    response_comment VARCHAR(1000),
    calendar_event_id VARCHAR(512),
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    created_by       VARCHAR(150),
    updated_by       VARCHAR(150),
    version          BIGINT,
    deleted_at       TIMESTAMP,

    CONSTRAINT fk_proposal_formation
        FOREIGN KEY (formation_id) REFERENCES formation.formations (id_formation) ON DELETE CASCADE,
    CONSTRAINT ck_proposal_type CHECK (proposal_type IN ('MANAGER_PROPOSAL','SELF_PROPOSAL')),
    CONSTRAINT ck_proposal_status CHECK (status IN (
        'PROPOSED','PENDING_VALIDATION','ACCEPTED_BY_TRAINER','REJECTED_BY_TRAINER',
        'APPROVED','REJECTED','CANCELLED','EXPIRED')),
    CONSTRAINT ck_proposer_type CHECK (proposer_type IN ('TEACHER','ANIMATEUR','EXTERNAL_TRAINER')),
    CONSTRAINT ck_proposal_role CHECK (role IN ('LEAD_TRAINER','CO_TRAINER','FACILITATOR'))
);

CREATE INDEX IF NOT EXISTS idx_proposal_formation ON formation.animator_proposals (formation_id);
CREATE INDEX IF NOT EXISTS idx_proposal_proposer ON formation.animator_proposals (proposer_id);
CREATE INDEX IF NOT EXISTS idx_proposal_status   ON formation.animator_proposals (status);
CREATE INDEX IF NOT EXISTS idx_proposal_proposed_by ON formation.animator_proposals (proposed_by);

-- ── 2. Affectations définitives ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS formation.formation_animators (
    id           BIGSERIAL PRIMARY KEY,
    formation_id BIGINT      NOT NULL,
    teacher_id   VARCHAR(50),
    animateur_id VARCHAR(50),
    role         VARCHAR(30) NOT NULL,
    assigned_by  VARCHAR(150) NOT NULL,
    assigned_at  TIMESTAMP   NOT NULL,
    status       VARCHAR(30) NOT NULL,
    proposal_id  BIGINT,
    created_at  TIMESTAMP,
    updated_at   TIMESTAMP,
    created_by   VARCHAR(150),
    updated_by   VARCHAR(150),
    version      BIGINT,
    deleted_at   TIMESTAMP,

    CONSTRAINT fk_assignment_formation
        FOREIGN KEY (formation_id) REFERENCES formation.formations (id_formation) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_proposal
        FOREIGN KEY (proposal_id) REFERENCES formation.animator_proposals (id) ON DELETE SET NULL,
    CONSTRAINT ck_assignment_role CHECK (role IN ('LEAD_TRAINER','CO_TRAINER','FACILITATOR')),
    CONSTRAINT ck_assignment_status CHECK (status IN ('ACTIVE','REPLACED','CANCELLED')),
    -- au moins un des deux identifiants (interne ou externe) doit être renseigné
    CONSTRAINT ck_assignment_person CHECK (
        (teacher_id IS NOT NULL AND animateur_id IS NULL)
        OR (teacher_id IS NULL AND animateur_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_assignment_formation ON formation.formation_animators (formation_id);
CREATE INDEX IF NOT EXISTS idx_assignment_teacher   ON formation.formation_animators (teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignment_role      ON formation.formation_animators (role);
CREATE UNIQUE INDEX IF NOT EXISTS uq_assignment_active_teacher_formation
    ON formation.formation_animators (formation_id, teacher_id, role)
    WHERE status = 'ACTIVE' AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_assignment_active_animateur_formation
    ON formation.formation_animators (formation_id, animateur_id, role)
    WHERE status = 'ACTIVE' AND deleted_at IS NULL;
