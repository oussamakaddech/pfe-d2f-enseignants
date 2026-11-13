package esprit.pfe.serviceformation.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "presences")
public class Presence extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idParticipation;

    @Column(name = "presence")
    private boolean present;
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private PresenceStatus status = PresenceStatus.ABSENT;
    @Column(name = "arrival_time")
    private LocalTime arrivalTime;
    @Column(name = "departure_time")
    private LocalTime departureTime;
    @Column(length = 500)
    private String justification;
    private String commentaire;
    @Column(name = "recorded_by", length = 150)
    private String recordedBy;
    @Column(name = "recorded_at")
    private LocalDateTime recordedAt;

    // Relation vers la séance à laquelle la présence est associée
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seance_id")
    private SeanceFormation seanceFormation;

    // Relation vers l'enseignant qui est présent à la séance
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enseignant_id")
    private Enseignant enseignant;
}
