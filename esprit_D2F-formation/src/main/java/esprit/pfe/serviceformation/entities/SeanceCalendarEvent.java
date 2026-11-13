package esprit.pfe.serviceformation.entities;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Événement Outlook d'une séance dans le calendrier personnel d'une personne
 * (animateur ou participant). Créé sans invités : aucun e-mail n'est envoyé
 * lors de sa création, de sa modification ou de sa suppression.
 */
@Data
@NoArgsConstructor
@Entity
@Table(
    name = "seance_calendar_event",
    schema = "formation",
    uniqueConstraints = @UniqueConstraint(name = "uq_seance_calendar_event", columnNames = {"seance_id", "email"})
)
public class SeanceCalendarEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "seance_id", nullable = false)
    private Long seanceId;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "event_id", nullable = false, length = 512)
    private String eventId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public SeanceCalendarEvent(Long seanceId, String email, String eventId) {
        this.seanceId = seanceId;
        this.email = email;
        this.eventId = eventId;
    }
}
