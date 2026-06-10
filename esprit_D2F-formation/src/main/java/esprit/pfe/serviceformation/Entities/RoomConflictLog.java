package esprit.pfe.serviceformation.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Journalise un conflit détecté lors de l'import ou de la validation du
 * calendrier (conflit de salle, doublon de formation, numérotation de séance
 * incohérente). Sert de piste d'audit et d'aide à la résolution manuelle.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "room_conflict_log", schema = "formation")
public class RoomConflictLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ROOM_OVERLAP, DUPLICATE_FORMATION ou SESSION_NUMBERING. */
    @Column(name = "conflict_type", length = 40, nullable = false)
    private String conflictType;

    @Column(name = "salle", length = 255)
    private String salle;

    @Column(name = "date_seance")
    private java.time.LocalDate dateSeance;

    @Column(name = "heure_debut", length = 10)
    private String heureDebut;

    @Column(name = "heure_fin", length = 10)
    private String heureFin;

    @Column(name = "seance_id")
    private Long seanceId;

    @Column(name = "other_seance_id")
    private Long otherSeanceId;

    @Column(name = "detail", length = 1000)
    private String detail;

    @Column(name = "detected_at", nullable = false)
    private LocalDateTime detectedAt;

    @Column(name = "import_log_id")
    private Long importLogId;
}
