-- Étape 2 : enrichir les évaluations pré/post avec les champs du référentiel,
-- la compétence ciblée et les tentatives de rattrapage.
ALTER TABLE learning_assessments
    ADD COLUMN IF NOT EXISTS competence_id BIGINT,
    ADD COLUMN IF NOT EXISTS target_level VARCHAR(50),
    ADD COLUMN IF NOT EXISTS auto_evaluation NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS objectifs_personnels VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS practical_score NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS trainer_comment VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS competences_acquises VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS target_reached BOOLEAN;

-- Une seule évaluation par couple (participant, formation, type, tentative) :
-- une seule tentative par défaut ; les rattrapages doivent être numérotés.
ALTER TABLE learning_assessments
    DROP CONSTRAINT IF EXISTS uk_learning_assessment_participant_training_type;

CREATE UNIQUE INDEX IF NOT EXISTS uk_learning_assessment_participant_training_type_attempt
    ON learning_assessments (participant_id, training_id, assessment_type, attempt_number);

CREATE INDEX IF NOT EXISTS idx_learning_assessment_competence
    ON learning_assessments (competence_id);