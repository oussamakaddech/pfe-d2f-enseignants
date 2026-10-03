package esprit.pfe.serviceformation.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

/**
 * Proposition d'animation d'une formation.
 *
 * <p>Règle DSI : une auto-proposition ne crée JAMAIS automatiquement une
 * affectation — un responsable (CUP, CHEF_DEPARTEMENT, ADMIN) doit la valider
 * avant création de {@link FormationAnimator} et envoi des invitations.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@SQLDelete(sql = "UPDATE formation.animator_proposals SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Table(name = "animator_proposals", schema = "formation",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_proposal_active_same_person_role_formation",
                columnNames = {"formation_id", "proposer_id", "role", "status"}))
public class FormationAnimatorProposal extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Formation concernée. */
    @Column(name = "formation_id", nullable = false)
    private Long formationId;

    /** Identifiant de la personne proposée (id enseignant / id animateur externe). */
    @Column(name = "proposer_id", nullable = false, length = 50)
    private String proposerId;

    /** Type de la personne proposée. */
    @Enumerated(EnumType.STRING)
    @Column(name = "proposer_type", nullable = false, length = 30)
    private ProposerType proposerType;

    /** Origine : MANAGER_PROPOSAL ou SELF_PROPOSAL. */
    @Enumerated(EnumType.STRING)
    @Column(name = "proposal_type", nullable = false, length = 30)
    private ProposalType proposalType;

    /** Rôle d'animation demandé. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AnimatorRole role;

    /** Statut courant de la proposition. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProposalStatus status;

    /** Motivation (obligatoire pour une auto-proposition). */
    @Column(length = 2000)
    private String motivation;

    /** Émetteur de la proposition (username JWT du responsable ou de la personne). */
    @Column(name = "proposed_by", length = 150)
    private String proposedBy;

    @Column(name = "proposed_at", nullable = false)
    private LocalDateTime proposedAt;

    /** Date de réponse de la personne proposée (accept/refuse). */
    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    /** Validateur (username JWT) — jamais le créateur de la proposition. */
    @Column(name = "validated_by", length = 150)
    private String validatedBy;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    /** Commentaire de la personne proposée lors de sa réponse. */
    @Column(name = "response_comment", length = 1000)
    private String responseComment;

    /** Événement calendrier déjà envoyé pour cette proposition (idempotence). */
    @Column(name = "calendar_event_id", length = 512)
    private String calendarEventId;

    /** DSI §4 — Soft delete. */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
