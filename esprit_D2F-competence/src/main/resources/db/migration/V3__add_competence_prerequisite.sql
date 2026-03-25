CREATE TABLE IF NOT EXISTS competence_prerequisite (
    id              BIGSERIAL PRIMARY KEY,
    competence_id   BIGINT NOT NULL REFERENCES competences(id) ON DELETE CASCADE,
    prerequisite_id BIGINT NOT NULL REFERENCES competences(id) ON DELETE CASCADE,
    niveau_minimum  VARCHAR(30) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_comp_prereq UNIQUE (competence_id, prerequisite_id),
    CONSTRAINT chk_no_self_prereq CHECK (competence_id <> prerequisite_id)
);

CREATE INDEX IF NOT EXISTS idx_prereq_competence ON competence_prerequisite(competence_id);
CREATE INDEX IF NOT EXISTS idx_prereq_prerequisite ON competence_prerequisite(prerequisite_id);
