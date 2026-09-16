package esprit.pfe.auth.error;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Thrown when a requested resource (user, role, etc.) does not exist.
 * Maps to HTTP 404 Not Found.
 */
@EqualsAndHashCode(callSuper = false)
@Data
public class ResourceNotFoundException extends RuntimeException {

    private static final Integer STATUS = 404;
    private final String errorMessage;

    public ResourceNotFoundException(String errorMessage) {
        super(errorMessage);
        this.errorMessage = errorMessage;
    }

    public Integer getStatus() {
        return STATUS;
    }
}
