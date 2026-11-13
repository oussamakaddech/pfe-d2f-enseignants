-- Événement Outlook d'une séance dans le calendrier PERSONNEL de chaque
-- animateur / participant (Graph, permission applicative Calendars.ReadWrite).
-- Un événement sans invités, créé directement dans la boîte de la personne,
-- est ajouté, modifié et supprimé sans aucun e-mail (contrairement à une
-- invitation de réunion, qui envoie un message à chaque création / mise à jour).
CREATE TABLE IF NOT EXISTS formation.seance_calendar_event (
    id          BIGSERIAL PRIMARY KEY,
    seance_id   BIGINT       NOT NULL REFERENCES formation.seances (id_seance) ON DELETE CASCADE,
    email       VARCHAR(255) NOT NULL,
    event_id    VARCHAR(512) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_seance_calendar_event UNIQUE (seance_id, email)
);

CREATE INDEX IF NOT EXISTS idx_sce_seance ON formation.seance_calendar_event (seance_id);
