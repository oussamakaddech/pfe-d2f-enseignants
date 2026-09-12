package esprit.pfe.serviceformation.messaging;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Événement d'affectation définitive / confirmation de formation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FormationAnimatorEvent {

    /** Identifiant unique (UUID) — idempotence. */
    private String eventId;
    /** ANIMATOR_ASSIGNED ou FORMATION_CONFIRMED ou CALENDAR_INVITATION_REQUESTED. */
    private String eventType;
    private Long assignmentId;
    private Long formationId;
    private String formationTitre;
    private Long proposalId;
    private String animatorId;
    private String animatorEmail;
    private String role;
    private String assignedBy;
    private Instant occurredAt;
}
