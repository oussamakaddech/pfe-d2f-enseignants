package esprit.pfe.servicecertificat.exception;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.UUID;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private static final String MODULE_PREFIX = "CERT";

    @ExceptionHandler({EntityNotFoundException.class, ResourceNotFoundException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(RuntimeException ex, HttpServletRequest request) {
        log.error("Resource not found: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), MODULE_PREFIX + "-404", request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(java.util.stream.Collectors.joining("; "));
        log.error("Validation error: {}", message);
        return buildResponse(HttpStatus.BAD_REQUEST, message, MODULE_PREFIX + "-400", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        log.error("Access denied: {}", ex.getMessage());
        return buildResponse(HttpStatus.FORBIDDEN, "Accès refusé : vous n'avez pas les permissions nécessaires.", MODULE_PREFIX + "-403", request);
    }

    @ExceptionHandler({AuthenticationException.class, BadCredentialsException.class})
    public ResponseEntity<ErrorResponse> handleAuthentication(Exception ex, HttpServletRequest request) {
        log.error("Authentication error: {}", ex.getMessage());
        return buildResponse(HttpStatus.UNAUTHORIZED, "Échec d'authentification : identifiants invalides ou session expirée.", MODULE_PREFIX + "-401", request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
        log.error("Illegal argument: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), MODULE_PREFIX + "-400", request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
        log.error("Data integrity violation: {}", ex.getMessage());
        String message = "Conflit de données : la ressource existe déjà ou une contrainte d'intégrité a été violée.";
        return buildResponse(HttpStatus.CONFLICT, message, MODULE_PREFIX + "-409", request);
    }

    @ExceptionHandler(PdfGenerationException.class)
    public ResponseEntity<ErrorResponse> handlePdfGeneration(PdfGenerationException ex, HttpServletRequest request) {
        log.error("PDF generation error: {}", ex.getMessage());
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), MODULE_PREFIX + "-500", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex, HttpServletRequest request) {
        String traceId = UUID.randomUUID().toString();
        log.error("Unexpected error [traceId: {}]: ", traceId, ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Une erreur inattendue s'est produite. Veuillez contacter le support technique.", MODULE_PREFIX + "-500", request, traceId);
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String message, String errorCode, HttpServletRequest request) {
        return buildResponse(status, message, errorCode, request, UUID.randomUUID().toString());
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String message, String errorCode, HttpServletRequest request, String traceId) {
        ErrorResponse response = ErrorResponse.builder()
                .timestamp(LocalDateTime.now().toString())
                .status(status.value())
                .errorCode(errorCode)
                .message(message)
                .path(request.getRequestURI())
                .traceId(traceId)
                .build();
        return new ResponseEntity<>(response, status);
    }
}
