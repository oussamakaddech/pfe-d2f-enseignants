package esprit.pfe.serviceformation.entities;

/**
 * Cycle de vie d'une proposition d'animation.
 *
 * <p>MANAGER_PROPOSAL : PROPOSED → (ACCEPTED_BY_TRAINER | REJECTED_BY_TRAINER) →
 * APPROVED (création FormationAnimator) | REJECTED | CANCELLED | EXPIRED.</p>
 *
 * <p>SELF_PROPOSAL : PENDING_VALIDATION → APPROVED | REJECTED | CANCELLED | EXPIRED.</p>
 */
public enum ProposalStatus {
    PROPOSED,
    PENDING_VALIDATION,
    ACCEPTED_BY_TRAINER,
    REJECTED_BY_TRAINER,
    APPROVED,
    REJECTED,
    CANCELLED,
    EXPIRED
}
