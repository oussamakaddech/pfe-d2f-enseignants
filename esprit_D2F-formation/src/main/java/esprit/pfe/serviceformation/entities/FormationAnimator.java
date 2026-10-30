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
 * Affectation définitive d'un animateur à une formation.
 *
 * <p>Créée UNIQUEMENT après validation d'une proposition (APPROVED) — jamais
 * automatiquement depuis une auto-proposition. Unicité applicative : une seule
 * affectation active par (formation, personne, rôle) et un seul LEAD_TRAINER
 * actif par formation.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@SQLDelete(sql = "UPDATE formation.formation_animators SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
@Table(name = "formation_animators", schema = "formation",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_assignment_active_person_formation",
                columnNames = {"formation_id", "teacher_id", "animateur_id", "role", "status"}))
public class FormationAnimator extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "formation_id", nullable = false)
    private Long formationId;

    /** Id enseignant interne (mutuellement exclusif avec animateurId). */
    @Column(name = "teacher_id", length = 50)
    private String teacherId;

    /** Id animateur externe (bureau) si formateur externe. */
    @Column(name = "animateur_id", length = 50)
    private String animateurId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AnimatorRole role;

    /** Username JWT du responsable qui a confirmé l'affectation. */
    @Column(name = "assigned_by", nullable = false, length = 150)
    private String assignedBy;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AssignmentStatus status;

    /** Proposition d'origine (traçabilité complète du workflow). */
    @Column(name = "proposal_id")
    private Long proposalId;

    /** DSI §4 — Soft delete. */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
