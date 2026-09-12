package esprit.pfe.serviceformation.exception;

/**
 * Conflit de proposition d'animation : doublon, transition de statut invalide,
 * affectation déjà existante, lead trainer déjà affecté.
 * HTTP 409.
 */
public class ProposalConflictException extends RuntimeException {
    public ProposalConflictException(String message) {
        super(message);
    }
}
