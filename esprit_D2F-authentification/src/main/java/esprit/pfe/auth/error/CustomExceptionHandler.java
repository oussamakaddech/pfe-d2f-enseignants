package esprit.pfe.auth.error;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.UUID;

@RestControllerAdvice
public class CustomExceptionHandler {

    @ExceptionHandler(LoginException.class)
    public ResponseEntity<CustomErrorResponse> handleLoginException(LoginException ex,
                                                                    HttpServletRequest request) {
        CustomErrorResponse errorResponse = buildErrorResponse(
                ex.getStatus(),
                ex.getErrorMessage(),
                "AUTH-" + ex.getStatus(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.valueOf(ex.getStatus()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(errorResponse);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<CustomErrorResponse> handleBadRequestException(BadRequestException ex,
                                                                         HttpServletRequest request) {
        CustomErrorResponse errorResponse = buildErrorResponse(
                ex.getStatus(),
                ex.getErrorMessage(),
                "AUTH-" + ex.getStatus(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.valueOf(ex.getStatus()))
                .contentType(MediaType.APPLICATION_JSON)
                .body(errorResponse);
    }

    private CustomErrorResponse buildErrorResponse(Integer status,
                                                   String message,
                                                   String errorCode,
                                                   String path) {
        HttpStatus httpStatus = HttpStatus.valueOf(status);
        CustomErrorResponse errorResponse = new CustomErrorResponse();
        errorResponse.setStatus(status);
        errorResponse.setError(httpStatus.getReasonPhrase());
        errorResponse.setErrorCode(errorCode);
        errorResponse.setMessage(message);
        errorResponse.setPath(path);
        errorResponse.setTraceId(UUID.randomUUID().toString());
        errorResponse.setTimestamp(LocalDateTime.now().toString());
        return errorResponse;
    }
}
