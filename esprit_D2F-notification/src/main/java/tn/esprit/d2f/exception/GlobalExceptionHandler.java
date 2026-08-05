package tn.esprit.d2f.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.UUID;
import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private static final String ERR_NOT_FOUND = "NOTIFICATION_NOT_FOUND";
    private static final String ERR_VALIDATION = "NOTIFICATION_VALIDATION_ERROR";
    private static final String ERR_BUSINESS_RULE = "NOTIFICATION_BUSINESS_RULE_VIOLATION";
    private static final String ERR_INTERNAL = "NOTIFICATION_INTERNAL_ERROR";

    @ExceptionHandler({ResourceNotFoundException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(
            ResourceNotFoundException ex, HttpServletRequest request) {
        log.warn("Resource not found at {}: {}", request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.NOT_FOUND, ERR_NOT_FOUND, ex.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining("; "));
        log.warn("Validation error at {}: {}", request.getRequestURI(), message);
        return build(HttpStatus.BAD_REQUEST, ERR_VALIDATION, message, request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest request) {
        log.warn("Business rule violation at {}: {}", request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, ERR_BUSINESS_RULE,
                "Requête invalide : vérifiez les paramètres envoyés.", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(
            Exception ex, HttpServletRequest request) {
        String traceId = UUID.randomUUID().toString();
        log.error("Unexpected error [traceId={}] at {}: {}", traceId, request.getRequestURI(), ex.getMessage(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, ERR_INTERNAL,
                "Une erreur inattendue s'est produite. Référence de support : " + traceId,
                request, traceId);
    }

    private ResponseEntity<ErrorResponse> build(
            HttpStatus status, String errorCode, String message, HttpServletRequest request) {
        return build(status, errorCode, message, request, UUID.randomUUID().toString());
    }

    private ResponseEntity<ErrorResponse> build(
            HttpStatus status, String errorCode, String message,
            HttpServletRequest request, String traceId) {
        ErrorResponse body = ErrorResponse.builder()
                .timestamp(Instant.now())
                .status(status.value())
                .errorCode(errorCode)
                .message(message)
                .path(request.getRequestURI())
                .traceId(traceId)
                .build();
        return new ResponseEntity<>(body, status);
    }
}