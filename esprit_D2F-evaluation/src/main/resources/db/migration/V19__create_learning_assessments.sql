CREATE TABLE IF NOT EXISTS learning_assessments (
    id BIGSERIAL PRIMARY KEY,
    training_id BIGINT NOT NULL,
    session_id BIGINT,
    participant_id VARCHAR(150) NOT NULL,
    assessment_type VARCHAR(10) NOT NULL CHECK (assessment_type IN ('PRE', 'POST')),
    score NUMERIC(8,2) NOT NULL CHECK (score >= 0),
    max_score NUMERIC(8,2) NOT NULL CHECK (max_score > 0),
    level_before VARCHAR(50),
    level_after VARCHAR(50),
    evaluated_by VARCHAR(150),
    evaluated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(150),
    updated_by VARCHAR(150),
    version BIGINT,
    deleted_at TIMESTAMP,
    CONSTRAINT uk_learning_assessment_participant_training_type
        UNIQUE (participant_id, training_id, assessment_type)
);