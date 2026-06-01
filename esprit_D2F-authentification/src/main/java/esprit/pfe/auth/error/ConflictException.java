package esprit.pfe.auth.error;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Conflit de ressource (HTTP 409) — ex. inscription avec un email/username déjà
 * utilisé. Distingué d'un {@link BadRequestException} (400) pour respecter la
 * sémantique REST attendue par l'audit DSI.
 */
@EqualsAndHashCode(callSuper = false)
@Data
public class ConflictException extends RuntimeException {
    private static final Integer STATUS = 409;
    private final String errorMessage;

    public ConflictException(String errorMessage) {
        super(errorMessage);
        this.errorMessage = errorMessage;
    }

    public Integer getStatus() {
        return STATUS;
    }
}
