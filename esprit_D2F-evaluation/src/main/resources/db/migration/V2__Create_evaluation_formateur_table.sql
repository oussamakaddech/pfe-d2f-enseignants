CREATE TABLE IF NOT EXISTS evaluation_formateur (
    id_eval_participant BIGSERIAL PRIMARY KEY,
    note REAL NOT NULL,
    satisfaisant BOOLEAN NOT NULL,
    commentaire VARCHAR(255),
    enseignant_id VARCHAR(255),
    formation_id BIGINT
);
