package esprit.pfe.auth.error;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class CustomExceptionHandler {

    @ExceptionHandler(LoginException.class)
    public ResponseEntity<CustomErrorResponse> handleLoginException(LoginException ex) {
        CustomErrorResponse errorResponse = new CustomErrorResponse(ex.getStatus(), ex.getErrorMessage());
        return ResponseEntity.status(HttpStatus.valueOf(errorResponse.getStatus()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(errorResponse);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<CustomErrorResponse> handleBadRequestException(BadRequestException ex) {
        CustomErrorResponse errorResponse = new CustomErrorResponse(ex.getStatus(), ex.getErrorMessage());
        return ResponseEntity.status(HttpStatus.valueOf(errorResponse.getStatus()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(errorResponse);
    }
}
