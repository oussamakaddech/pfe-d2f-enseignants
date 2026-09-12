package esprit.pfe.serviceformation.exception;

/**
 * Compétences ou disponibilités incompatibles pour une proposition d'animation.
 * HTTP 422.
 */
public class ProposalIncompatibilityException extends RuntimeException {
    public ProposalIncompatibilityException(String message) {
        super(message);
    }
}
