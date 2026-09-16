package esprit.pfe.serviceformation.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Trace d'un import de calendrier d'ateliers (.xlsx). Conserve uniquement des
 * métadonnées agrégées — aucune donnée nominative (DSI §sécurité : pas de PII
 * sensible persistée hors des entités métier dédiées).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "import_log", schema = "formation")
public class ImportLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    /** Empreinte SHA-256 du fichier — détection d'un ré-import identique. */
    @Column(name = "file_hash", length = 64)
    private String fileHash;

    @Column(name = "imported_by", length = 150)
    private String importedBy;

    @Column(name = "imported_at", nullable = false)
    private LocalDateTime importedAt;

    @Column(name = "formations_created", nullable = false)
    private int formationsCreated;

    @Column(name = "sessions_created", nullable = false)
    private int sessionsCreated;

    @Column(name = "participants_imported", nullable = false)
    private int participantsImported;

    @Column(name = "rows_skipped", nullable = false)
    private int rowsSkipped;

    @Column(name = "conflicts_detected", nullable = false)
    private int conflictsDetected;

    /** SUCCESS, PARTIAL ou FAILED. */
    @Column(name = "status", length = 20, nullable = false)
    private String status;
}
