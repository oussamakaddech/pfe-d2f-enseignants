package esprit.pfe.auth.error;

import lombok.Data;

@Data
public class LoginException extends RuntimeException {
    private Integer status = 401;
    private String errorMessage;

    public LoginException(String errorMessage) {
        this.errorMessage = errorMessage;

    }
}
