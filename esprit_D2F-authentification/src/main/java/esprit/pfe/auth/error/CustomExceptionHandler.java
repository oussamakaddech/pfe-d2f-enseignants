package esprit.pfe.auth.error;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.UUID;

@RestControllerAdvice
public class CustomExceptionHandler {

        private static final Logger log = LoggerFactory.getLogger(CustomExceptionHandler.class);
        private static final String ERROR_CODE_PREFIX = "AUTH-";

        @ExceptionHandler(LoginException.class)
        public ResponseEntity<CustomErrorResponse> handleLoginException(LoginException ex,
                        HttpServletRequest request) {
                logHandled(ex.getStatus(), ex.getErrorMessage(), request);
                CustomErrorResponse errorResponse = buildErrorResponse(
                                ex.getStatus(),
                                ex.getErrorMessage(),
                                ERROR_CODE_PREFIX + ex.getStatus(),
                                request.getRequestURI());
                return ResponseEntity.status(HttpStatus.valueOf(ex.getStatus()))
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(errorResponse);
        }

        @ExceptionHandler(BadRequestException.class)
        public ResponseEntity<CustomErrorResponse> handleBadRequestException(BadRequestException ex,
                        HttpServletRequest request) {
                logHandled(ex.getStatus(), ex.getErrorMessage(), request);
                CustomErrorResponse errorResponse = buildErrorResponse(
                                ex.getStatus(),
                                ex.getErrorMessage(),
                                ERROR_CODE_PREFIX + ex.getStatus(),
                                request.getRequestURI());
                return ResponseEntity.status(HttpStatus.valueOf(ex.getStatus()))
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(errorResponse);
        }

        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<CustomErrorResponse> handleResourceNotFoundException(ResourceNotFoundException ex,
                        HttpServletRequest request) {
                logHandled(ex.getStatus(), ex.getErrorMessage(), request);
                CustomErrorResponse errorResponse = buildErrorResponse(
                                ex.getStatus(),
                                ex.getErrorMessage(),
                                ERROR_CODE_PREFIX + ex.getStatus(),
                                request.getRequestURI());
                return ResponseEntity.status(HttpStatus.valueOf(ex.getStatus()))
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(errorResponse);
        }

        @ExceptionHandler(TokenExpiredException.class)
        public ResponseEntity<CustomErrorResponse> handleTokenExpiredException(TokenExpiredException ex,
                        HttpServletRequest request) {
                logHandled(ex.getStatus(), ex.getErrorMessage(), request);
                CustomErrorResponse errorResponse = buildErrorResponse(
                                ex.getStatus(),
                                ex.getErrorMessage(),
                                ERROR_CODE_PREFIX + ex.getStatus(),
                                request.getRequestURI());
                return ResponseEntity.status(HttpStatus.valueOf(ex.getStatus()))
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(errorResponse);
        }

        private void logHandled(Integer status, String message, HttpServletRequest request) {
                log.warn("[AUTH-{}] {} {} → {}",
                                status,
                                request.getMethod(),
                                request.getRequestURI(),
                                message);
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