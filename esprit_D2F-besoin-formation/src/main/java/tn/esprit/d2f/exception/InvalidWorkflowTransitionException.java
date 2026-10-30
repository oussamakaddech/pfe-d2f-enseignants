package tn.esprit.d2f.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Transition de workflow invalide (mauvais stade, besoin déjà traité, double
 * approbation, conflit de traitement concurrent).
 *
 * <p>Mappée en HTTP 409 Conflict par {@link GlobalExceptionHandler}.</p>
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class InvalidWorkflowTransitionException extends RuntimeException {

    public InvalidWorkflowTransitionException(String message) {
        super(message);
    }
}
