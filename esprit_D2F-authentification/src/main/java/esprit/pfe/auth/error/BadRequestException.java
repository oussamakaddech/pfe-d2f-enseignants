package esprit.pfe.auth.error;

import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = false)
@Data
public class BadRequestException extends RuntimeException{
    private static final Integer STATUS = 400;
    private final String errorMessage;

    public BadRequestException(String errorMessage) {
        super(errorMessage);
        this.errorMessage = errorMessage;
    }

    public Integer getStatus() {
        return STATUS;
    }
}
