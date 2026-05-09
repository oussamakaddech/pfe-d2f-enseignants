package esprit.pfe.auth.error;

import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = false)
public class LoginException extends RuntimeException {
    private static final Integer STATUS = 401;
    private final String errorMessage;

    public LoginException(String errorMessage) {
        super(errorMessage);
        this.errorMessage = errorMessage;
    }

    public Integer getStatus() {
        return STATUS;
    }

    public String getErrorMessage() {
        return errorMessage;
    }
}
