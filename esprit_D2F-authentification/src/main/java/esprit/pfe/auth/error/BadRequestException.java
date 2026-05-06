package esprit.pfe.auth.error;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = false)
public class BadRequestException extends RuntimeException{
    private Integer status = 400;
    private String errorMessage;

    public BadRequestException(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
