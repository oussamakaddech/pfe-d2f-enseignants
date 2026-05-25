package esprit.pfe.serviceformation.exception;

import esprit.pfe.serviceformation.entities.EtatFormation;
import lombok.Getter;

/**
 * Exception thrown when an invalid state transition is attempted on a Formation.
 * Follows DSI standard error format with errorCode: FORMATION_INVALID_STATE_TRANSITION
 */
@Getter
public class FormationStateException extends RuntimeException {
    
    private final EtatFormation currentState;
    private final EtatFormation attemptedState;
    private static final String ERROR_CODE = "FORMATION_INVALID_STATE_TRANSITION";
    
    public FormationStateException(EtatFormation currentState, EtatFormation attemptedState) {
        super(String.format(
            "Cannot move formation from %s to %s. Invalid state transition.",
            currentState,
            attemptedState
        ));
        this.currentState = currentState;
        this.attemptedState = attemptedState;
    }
    
    public FormationStateException(String message) {
        super(message);
        this.currentState = null;
        this.attemptedState = null;
    }
    
    @Override
    public String toString() {
        return String.format(
            "FormationStateException{errorCode='%s', currentState=%s, attemptedState=%s, message='%s'}",
            ERROR_CODE, currentState, attemptedState, getMessage()
        );
    }

    public String getErrorCode() {
        return ERROR_CODE;
    }
}