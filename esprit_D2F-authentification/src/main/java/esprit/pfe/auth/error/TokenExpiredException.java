package esprit.pfe.auth.error;

import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = false)
@Data
public class TokenExpiredException extends RuntimeException {
    private static final Integer STATUS = 410; // 410 Gone — le token a expiré

    private final String errorMessage;

    public TokenExpiredException(String errorMessage) {
        super(errorMessage);
        this.errorMessage = errorMessage;
    }

    public Integer getStatus() {
        return STATUS;
    }
}
