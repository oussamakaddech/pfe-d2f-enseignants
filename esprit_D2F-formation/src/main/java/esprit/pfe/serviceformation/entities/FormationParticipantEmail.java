package esprit.pfe.serviceformation.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Adresse e-mail d'un participant rattachée à une formation, telle qu'importée
 * depuis les sections « participants » du calendrier des ateliers.
 * <p>
 * Table d'extension (enfant de {@link Formation}) : permet de conserver les
 * adresses des participants qui ne correspondent à aucun enseignant référencé,
 * sans fabriquer de fausses fiches dans le référentiel Enseignant.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(
        name = "formation_participant_email",
        schema = "formation",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_formation_participant_email",
                columnNames = {"formation_id", "email"}))
public class FormationParticipantEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "formation_id", nullable = false)
    private Long formationId;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    /** True si l'adresse correspond à un enseignant déjà référencé. */
    @Column(name = "matched_enseignant", nullable = false)
    private boolean matchedEnseignant;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
