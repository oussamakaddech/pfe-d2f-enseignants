-- Journal des conflits détectés (salle, doublon de formation, numérotation de
-- séance incohérente) lors de l'import ou de la validation du calendrier.
CREATE TABLE IF NOT EXISTS formation.room_conflict_log (
    id              BIGSERIAL PRIMARY KEY,
    conflict_type   VARCHAR(40)  NOT NULL,
    salle           VARCHAR(255),
    date_seance     DATE,
    heure_debut     VARCHAR(10),
    heure_fin       VARCHAR(10),
    seance_id       BIGINT,
    other_seance_id BIGINT,
    detail          VARCHAR(1000),
    detected_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    import_log_id   BIGINT REFERENCES formation.import_log (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_room_conflict_detected_at ON formation.room_conflict_log (detected_at);
CREATE INDEX IF NOT EXISTS idx_room_conflict_import ON formation.room_conflict_log (import_log_id);
