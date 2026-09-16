-- Flyway Migration V14: Add formation_animateur table
-- Purpose: Link animateurs directly to a formation (not just seances)
-- Conformite: DSI §3.2

CREATE TABLE IF NOT EXISTS formation_animateur (
    formation_id BIGINT NOT NULL,
    enseignant_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (formation_id, enseignant_id),
    CONSTRAINT fk_formation_animateur_formation
        FOREIGN KEY (formation_id) REFERENCES formations(id_formation) ON DELETE CASCADE,
    CONSTRAINT fk_formation_animateur_enseignant
        FOREIGN KEY (enseignant_id) REFERENCES enseignants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_formation_animateur_formation_id ON formation_animateur(formation_id);
CREATE INDEX IF NOT EXISTS idx_formation_animateur_enseignant_id ON formation_animateur(enseignant_id);
