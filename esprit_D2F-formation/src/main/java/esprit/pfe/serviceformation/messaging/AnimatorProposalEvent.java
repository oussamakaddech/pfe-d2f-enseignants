package esprit.pfe.serviceformation.messaging;

import esprit.pfe.serviceformation.entities.AnimatorRole;
import esprit.pfe.serviceformation.entities.ProposalStatus;
import esprit.pfe.serviceformation.entities.ProposalType;
import esprit.pfe.serviceformation.entities.ProposerType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Événement de cycle de vie d'une proposition d'animation (RabbitMQ).
 *
 * <p>Idempotence : {@code eventId} unique par transition — le consommateur
 * déduit les doublons sur cette clé.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnimatorProposalEvent {

    /** Identifiant d'événement unique (UUID) — idempotence consommateur. */
    private String eventId;
    /** Type d'événement : CREATED, ACCEPTED, REJECTED_BY_TRAINER, APPROVED, MANAGER_REJECTED, WITHDRAWN. */
    private String eventType;
    private Long proposalId;
    private Long formationId;
    private String formationTitre;
    private String proposerId;
    private String proposerEmail;
    private ProposerType proposerType;
    private ProposalType proposalType;
    private AnimatorRole role;
    private ProposalStatus status;
    private String actorUsername;
    private Instant occurredAt;
}
