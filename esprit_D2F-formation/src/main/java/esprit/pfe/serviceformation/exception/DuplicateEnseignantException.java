package esprit.pfe.serviceformation.exception;

/**
 * Levée lorsqu'on tente de créer un enseignant avec un email déjà présent dans
 * l'annuaire. Mappée en HTTP 409 Conflict par {@code GlobalExceptionHandler}.
 */
public class DuplicateEnseignantException extends RuntimeException {
    public DuplicateEnseignantException(String message) {
        super(message);
    }
}
