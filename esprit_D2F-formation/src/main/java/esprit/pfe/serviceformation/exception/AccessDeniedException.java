package esprit.pfe.serviceformation.exception;

/**
 * Exception levée quand un utilisateur n'a pas les droits d'accès requis (Task 7).
 */
public class AccessDeniedException extends RuntimeException {
    
    public AccessDeniedException(String message) {
        super(message);
    }
    
    public AccessDeniedException(String message, Throwable cause) {
        super(message, cause);
    }
}
