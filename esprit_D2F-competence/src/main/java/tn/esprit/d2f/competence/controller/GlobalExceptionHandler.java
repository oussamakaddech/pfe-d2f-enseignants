package tn.esprit.d2f.competence.controller;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String MODULE_PREFIX = "COMP";
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex,
                                                                   HttpServletRequest request) {
        return buildResponse(HttpStatus.FORBIDDEN, "Accès refusé : vous n'avez pas les droits nécessaires.",
                MODULE_PREFIX + "-403", request.getRequestURI());
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(EntityNotFoundException ex,
                                                               HttpServletRequest request) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(),
                MODULE_PREFIX + "-404", request.getRequestURI());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex,
                                                                  HttpServletRequest request) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(),
                MODULE_PREFIX + "-400", request.getRequestURI());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex,
                                                                  HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Erreur de validation");
        return buildResponse(HttpStatus.BAD_REQUEST, message,
                MODULE_PREFIX + "-422", request.getRequestURI());
    }

    /**
     * Contrainte d’unicité ou clé étrangère violée – réponse 409 Conflict.
     * Permet au client de distinguer un doublon d’une erreur générique.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        String rootCause = ex.getMostSpecificCause().getMessage();
        String lowerRootCause = rootCause == null ? "" : rootCause.toLowerCase();
        log.warn("[{}] Violation d’intégrité des données: {}", MODULE_PREFIX + "-409", rootCause, ex);
        String message;
        if (lowerRootCause.contains("value too long") || lowerRootCause.contains("too long for type character varying")) {
            message = "Conflit de données : une valeur dépasse la taille maximale autorisée.";
        } else if (lowerRootCause.contains("unique")) {
            message = "Conflit de données : une ressource avec ces informations existe déjà.";
        } else {
            message = "Conflit de données : contrainte d'intégrité violée.";
        }
        return buildResponse(HttpStatus.CONFLICT, message,
                MODULE_PREFIX + "-409", request.getRequestURI());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex,
                                                               HttpServletRequest request) {
        String traceId = UUID.randomUUID().toString();
        log.error("[{}] Erreur interne non gérée: {}", traceId, ex.getMessage(), ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                "Erreur interne du serveur. Référence: " + traceId,
                MODULE_PREFIX + "-500", request.getRequestURI());
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message,
                                                               String errorCode, String path) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("errorCode", errorCode);
        body.put("message", message);
        body.put("path", path);
        body.put("traceId", UUID.randomUUID().toString());
        return new ResponseEntity<>(body, status);
    }
}
