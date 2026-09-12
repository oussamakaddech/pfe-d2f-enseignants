package tn.esprit.d2f.exception;

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
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Gestionnaire global d'erreurs — conformité DSI §4.
 * Toutes les réponses d'erreur respectent le format canonique ErrorResponse.
 * AUCUN détail interne (stack trace, message DB brut) n'est exposé au client.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // ── Codes d'erreur sémantiques (jamais de stack traces côté client) ──────

    private static final String ERR_NOT_FOUND          = "BESOIN_NOT_FOUND";
    private static final String ERR_VALIDATION         = "BESOIN_VALIDATION_ERROR";
    private static final String ERR_ACCESS_DENIED      = "BESOIN_ACCESS_DENIED";
    private static final String ERR_UNAUTHORIZED        = "BESOIN_UNAUTHORIZED";
    private static final String ERR_BUSINESS_RULE      = "BESOIN_BUSINESS_RULE_VIOLATION";
    private static final String ERR_WORKFLOW_CONFLICT  = "BESOIN_WORKFLOW_CONFLICT";
    private static final String ERR_CONCURRENT_MODIF    = "BESOIN_CONCURRENT_MODIFICATION";
    private static final String ERR_DATA_CONFLICT      = "BESOIN_DATA_CONFLICT";
    private static final String ERR_INTERNAL            = "BESOIN_INTERNAL_ERROR";

    // ── 404 — Ressource introuvable ───────────────────────────────────────────

    @ExceptionHandler({EntityNotFoundException.class, ResourceNotFoundException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(
            RuntimeException ex, HttpServletRequest request) {
        log.warn("Resource not found at {}: {}", request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.NOT_FOUND, ERR_NOT_FOUND, ex.getMessage(), request);
    }

    // ── 400 — Erreurs de validation (Bean Validation) ─────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining("; "));
        log.warn("Validation error at {}: {}", request.getRequestURI(), message);
        return build(HttpStatus.BAD_REQUEST, ERR_VALIDATION, message, request);
    }

    // ── 400 — Règle métier enfreinte (IllegalStateException / IllegalArgument) ─

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest request) {
        // Log message internally but do NOT send raw Java message to client
        log.warn("Business rule violation at {}: {}", request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, ERR_BUSINESS_RULE,
                "Requête invalide : vérifiez les paramètres envoyés.", request);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(
            IllegalStateException ex, HttpServletRequest request) {
        log.warn("Illegal state at {}: {}", request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, ERR_BUSINESS_RULE, ex.getMessage(), request);
    }

    // ── 403 — Accès interdit ──────────────────────────────────────────────────

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        log.warn("Access denied at {} : {}", request.getRequestURI(), ex.getMessage());
        // Fait passer les messages métier du workflow (périmètre, créateur,
        // étape) ; les refus Spring par défaut restent génériques.
        String raw = ex.getMessage();
        String msg = (raw != null && !raw.isBlank()
                && !raw.equals("Access Denied") && !raw.startsWith("Access is denied"))
                ? raw
                : "Accès refusé : vous n'avez pas les permissions nécessaires pour cette opération.";
        return build(HttpStatus.FORBIDDEN, ERR_ACCESS_DENIED, msg, request);
    }

    // ── 409 — Transition de workflow invalide ───────────────────────────────

    @ExceptionHandler(InvalidWorkflowTransitionException.class)
    public ResponseEntity<ErrorResponse> handleWorkflowConflict(
            InvalidWorkflowTransitionException ex, HttpServletRequest request) {
        log.warn("Workflow conflict at {}: {}", request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.CONFLICT, ERR_WORKFLOW_CONFLICT, ex.getMessage(), request);
    }

    // ── 409 — Modification concurrente (verrou optimiste @Version) ──────────

    @ExceptionHandler({
            org.springframework.orm.ObjectOptimisticLockingFailureException.class,
            jakarta.persistence.OptimisticLockException.class
    })
    public ResponseEntity<ErrorResponse> handleOptimisticLock(
            RuntimeException ex, HttpServletRequest request) {
        log.warn("Concurrent modification at {}: {}", request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.CONFLICT, ERR_CONCURRENT_MODIF,
                "Traitement concurrent : le besoin a été modifié entre-temps, rechargez puis réessayez.",
                request);
    }

    // ── 401 — Authentification échouée ────────────────────────────────────────

    @ExceptionHandler({AuthenticationException.class, BadCredentialsException.class})
    public ResponseEntity<ErrorResponse> handleAuthentication(
            Exception ex, HttpServletRequest request) {
        log.warn("Authentication failure at {}", request.getRequestURI());
        return build(HttpStatus.UNAUTHORIZED, ERR_UNAUTHORIZED,
                "Authentification requise : token absent, expiré ou invalide.", request);
    }

    // ── 409 — Conflit d'intégrité des données ─────────────────────────────────

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        // Log full cause internally; NEVER send raw DB message to client
        log.error("Data integrity violation at {}: {}", request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.CONFLICT, ERR_DATA_CONFLICT,
                "Conflit de données : une contrainte d'intégrité a été violée.", request);
    }

    /**
     * Ressource statique / endpoint introuvable → 404 (au lieu de 500).
     * Empêche NoResourceFoundException de tomber dans le handler générique.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(
            NoResourceFoundException ex, HttpServletRequest request) {
        log.warn("Resource not found at {}: {}", request.getRequestURI(), ex.getMessage());
        return build(HttpStatus.NOT_FOUND, ERR_NOT_FOUND,
                "La ressource demandée n'existe pas : " + ex.getResourcePath(), request);
    }

    // ── 500 — Erreur inattendue ───────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(
            Exception ex, HttpServletRequest request) {
        String traceId = UUID.randomUUID().toString();
        // Log full stack trace with traceId for internal diagnosis
        log.error("Unexpected error [traceId={}] at {}: {}", traceId, request.getRequestURI(), ex.getMessage(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, ERR_INTERNAL,
                "Une erreur inattendue s'est produite. Référence de support : " + traceId,
                request, traceId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ResponseEntity<ErrorResponse> build(
            HttpStatus status, String errorCode, String message, HttpServletRequest request) {
        return build(status, errorCode, message, request, UUID.randomUUID().toString());
    }

    private ResponseEntity<ErrorResponse> build(
            HttpStatus status, String errorCode, String message,
            HttpServletRequest request, String traceId) {
        ErrorResponse body = ErrorResponse.builder()
                .timestamp(Instant.now().toString())   // proper UTC ISO-8601: "2026-05-23T14:30:00.123Z"
                .status(status.value())
                .errorCode(errorCode)
                .message(message)
                .path(request.getRequestURI())
                .traceId(traceId)
                .build();
        return new ResponseEntity<>(body, status);
    }
}
