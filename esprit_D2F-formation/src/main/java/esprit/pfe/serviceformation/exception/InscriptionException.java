package esprit.pfe.serviceformation.exception;

/**
 * Exception thrown for inscription-related business rule violations.
 * Results in HTTP 409 CONFLICT response.
 * 
 * Examples:
 * - InscriptionAlreadyExistsException: Teacher already enrolled
 * - CapacityExceededException: Max participants reached
 * - InscriptionClosedException: Inscriptions closed or formation started
 * - InvalidFormationStateException: Cannot enroll in ANNULEE/ACHEVEE formation
 */
public class InscriptionException extends RuntimeException {
    
    private final String errorCode;
    
    public static final String ALREADY_EXISTS = "INSCRIPTION_ALREADY_EXISTS";
    public static final String CAPACITY_EXCEEDED = "CAPACITY_EXCEEDED";
    public static final String CLOSED = "INSCRIPTION_CLOSED";
    public static final String INVALID_STATE = "INVALID_FORMATION_STATE";
    
    public InscriptionException(String message) {
        super(message);
        this.errorCode = "INSCRIPTION_ERROR";
    }
    
    public InscriptionException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }
    
    public InscriptionException(String message, Throwable cause) {
        super(message, cause);
        this.errorCode = "INSCRIPTION_ERROR";
    }
    
    public InscriptionException(String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
    
    // Factory methods for common cases
    
    public static InscriptionException alreadyExists(Long formationId, String teacherId) {
        return new InscriptionException(
            String.format("Teacher %s is already enrolled in formation %d", teacherId, formationId),
            ALREADY_EXISTS
        );
    }
    
    public static InscriptionException capacityExceeded(Long formationId, int maxParticipants) {
        return new InscriptionException(
            String.format("Formation %d has reached maximum capacity of %d participants", formationId, maxParticipants),
            CAPACITY_EXCEEDED
        );
    }
    
    public static InscriptionException closedInscription(Long formationId) {
        return new InscriptionException(
            String.format("Inscriptions are closed for formation %d", formationId),
            CLOSED
        );
    }

    
    public static InscriptionException alreadyStarted(Long formationId) {
        return new InscriptionException(
            String.format("Formation %d has already started, inscriptions are no longer accepted", formationId),
            CLOSED
        );
    }
    
    public static InscriptionException invalidState(Long formationId, String currentState) {
        return new InscriptionException(
            String.format("Cannot enroll in formation %d in state %s", formationId, currentState),
            INVALID_STATE
        );
    }
}