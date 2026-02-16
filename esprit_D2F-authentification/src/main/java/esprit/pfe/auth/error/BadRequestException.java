package esprit.pfe.auth.error;

import lombok.Data;

@Data
public class BadRequestException extends RuntimeException{
    private Integer status = 400;
    private String errorMessage;

    public BadRequestException(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
