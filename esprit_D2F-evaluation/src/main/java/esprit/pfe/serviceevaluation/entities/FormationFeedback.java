package esprit.pfe.serviceevaluation.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Réponse d'un participant au questionnaire de satisfaction d'une formation
 * (aspects organisationnel, technique et pédagogique notés de 1 à 5, besoin de
 * formation complémentaire, remarques libres). Une réponse par participant.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "formation_feedback",
        uniqueConstraints = @UniqueConstraint(name = "uq_formation_feedback", columnNames = {"formation_id", "enseignant_id"}))
public class FormationFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "formation_id", nullable = false)
    private Long formationId;

    /** Fiche du participant : empêche une double réponse, jamais exposée dans les statistiques. */
    @Column(name = "enseignant_id", nullable = false, length = 64)
    private String enseignantId;

    @Column(name = "participant_email")
    private String participantEmail;

    /** UP du participant au moment de la réponse (agrégée dans les statistiques). */
    @Column(name = "up")
    private String up;

    @Column(name = "aspect_organisationnel", nullable = false)
    private Integer aspectOrganisationnel;

    @Column(name = "aspect_technique", nullable = false)
    private Integer aspectTechnique;

    @Column(name = "aspect_pedagogique", nullable = false)
    private Integer aspectPedagogique;

    @Column(name = "besoin_complementaire", nullable = false)
    private Boolean besoinComplementaire;

    @Column(name = "autres_informations", length = 2000)
    private String autresInformations;

    @Column(name = "autres_besoins", length = 2000)
    private String autresBesoins;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
