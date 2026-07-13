package esprit.pfe.serviceformation.exception;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Global Exception Handler for Formation Service
 * 
 * Provides standardized error responses following DSI format:
 * {
 *   "timestamp": "ISO-8601",
 *   "status": 409,
 *   "errorCode": "FORMATION_INVALID_STATE_TRANSITION",
 *   "message": "Cannot move formation to EN_COURS from ANNULEE",
 *   "path": "/api/v1/formations/12/workflow",
 *   "traceId": "UUID"
 * }
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private static final String MODULE_PREFIX = "FORM";
    private static final ObjectMapper UPSTREAM_MAPPER = new ObjectMapper();

    // ==================== NOT FOUND ====================
    
    @ExceptionHandler({EntityNotFoundException.class, ResourceNotFoundException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(RuntimeException ex, HttpServletRequest request) {
        log.error("Resource not found: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), MODULE_PREFIX + "-404", request);
    }

    // ==================== VALIDATION ====================
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining("; "));
        log.error("Validation error: {}", message);
        return buildResponse(HttpStatus.BAD_REQUEST, message, MODULE_PREFIX + "-VALIDATION-400", request);
    }

    // ==================== STATE TRANSITIONS ====================
    
    @ExceptionHandler(FormationStateException.class)
    public ResponseEntity<ErrorResponse> handleFormationState(FormationStateException ex, HttpServletRequest request) {
        log.warn("Invalid formation state transition: {}", ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage(), ex.getErrorCode(), request);
    }

    // ==================== INSCRIPTION ERRORS ====================
    
    @ExceptionHandler(InscriptionException.class)
    public ResponseEntity<ErrorResponse> handleInscription(InscriptionException ex, HttpServletRequest request) {
        log.warn("Inscription error: {}", ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage(), MODULE_PREFIX + "-INSCRIPTION-409", request);
    }

    // ==================== DUPLICATE ENSEIGNANT ====================

    @ExceptionHandler(DuplicateEnseignantException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateEnseignant(DuplicateEnseignantException ex, HttpServletRequest request) {
        log.warn("Duplicate enseignant: {}", ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage(), MODULE_PREFIX + "-ENSEIGNANT-409", request);
    }

    // ==================== ACCESS CONTROL ====================
    
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

    // ==================== ILLEGAL ARGUMENTS/STATE ====================
    
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
        log.error("Illegal argument: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), MODULE_PREFIX + "-400", request);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException ex, HttpServletRequest request) {
        log.error("Illegal state: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), MODULE_PREFIX + "-400", request);
    }

    // ==================== DATA INTEGRITY ====================
    
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
        log.error("Data integrity violation: {}", ex.getMessage());
        String message = "Conflit de données : la ressource existe déjà ou une contrainte d'intégrité a été violée.";
        return buildResponse(HttpStatus.CONFLICT, message, MODULE_PREFIX + "-409", request);
    }

    // Mauvais usage de l'API de persistance (ex. référence vers une entité
    // transient/détachée non résolue). Symptôme côté client = 400 clair plutôt
    // qu'un 500 générique « erreur inattendue ».
    @ExceptionHandler(InvalidDataAccessApiUsageException.class)
    public ResponseEntity<ErrorResponse> handleInvalidApiUsage(InvalidDataAccessApiUsageException ex, HttpServletRequest request) {
        log.error("Invalid data access API usage: {}", ex.getMessage());
        String message = "Requête invalide : une référence (UP, département…) est introuvable ou mal formée.";
        return buildResponse(HttpStatus.BAD_REQUEST, message, MODULE_PREFIX + "-400", request);
    }

    // ==================== INTER-SERVICE (FEIGN) ====================

    // Erreur remontée par un service amont via Feign (ex. auth lors de la
    // création orchestrée compte + fiche). On reporte le statut d'origine
    // (409 email/username déjà pris, 403 droits insuffisants…) et son message,
    // plutôt qu'un 500 opaque.
    @ExceptionHandler(FeignException.class)
    public ResponseEntity<ErrorResponse> handleFeign(FeignException ex, HttpServletRequest request) {
        return buildFeignResponse(ex, request);
    }

    private ResponseEntity<ErrorResponse> buildFeignResponse(FeignException ex, HttpServletRequest request) {
        int rawStatus = ex.status();
        HttpStatus status = HttpStatus.resolve(rawStatus);
        if (status == null || rawStatus <= 0) {
            // -1 = service injoignable / timeout
            status = HttpStatus.BAD_GATEWAY;
        }
        String upstreamMessage = extractUpstreamMessage(ex);
        String message = upstreamMessage != null ? upstreamMessage
                : "Le service d'authentification a refusé la requête.";
        log.error("Feign error [status={}]: {}", rawStatus, ex.getMessage());
        return buildResponse(status, message, MODULE_PREFIX + "-UPSTREAM-" + status.value(), request);
    }

    /** Recherche une {@link FeignException} dans la chaîne de causes (utile quand
     * Resilience4j / circuit breaker l'enveloppe, ex. NoFallbackAvailableException). */
    private FeignException findFeignCause(Throwable ex) {
        Throwable current = ex;
        int guard = 0;
        while (current != null && guard++ < 10) {
            if (current instanceof FeignException fe) {
                return fe;
            }
            current = current.getCause();
        }
        return null;
    }

    /** Extrait le champ {@code message} du corps d'erreur JSON renvoyé par le service amont. */
    private String extractUpstreamMessage(FeignException ex) {
        String body = ex.contentUTF8();
        if (body == null || body.isBlank()) {
            return null;
        }
        try {
            JsonNode node = UPSTREAM_MAPPER.readTree(body);
            JsonNode message = node.get("message");
            if (message != null && !message.asText().isBlank()) {
                return message.asText();
            }
        } catch (Exception parseEx) {
            log.debug("Corps d'erreur amont non-JSON, ignoré: {}", parseEx.getMessage());
        }
        return null;
    }

    // ==================== EXTERNAL SERVICES ====================

    @ExceptionHandler(MicrosoftGraphException.class)
    public ResponseEntity<ErrorResponse> handleMicrosoftGraph(MicrosoftGraphException ex, HttpServletRequest request) {
        log.error("Microsoft Graph API error: {}", ex.getMessage());
        return buildResponse(HttpStatus.SERVICE_UNAVAILABLE, 
                "Le service externe (Microsoft Graph) est temporairement indisponible. Veuillez réessayer plus tard.",
                MODULE_PREFIX + "-503", request);
    }

    // ==================== HTTP MESSAGE / TRANSACTION ====================

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleNotReadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        log.error("Message not readable: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, "Corps de la requête illisible ou mal formé.", MODULE_PREFIX + "-400", request);
    }

    @ExceptionHandler(TransactionSystemException.class)
    public ResponseEntity<ErrorResponse> handleTransactionSystem(TransactionSystemException ex, HttpServletRequest request) {
        log.error("Transaction system error: {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, "Erreur de transaction : contrainte de validation non respectée.", MODULE_PREFIX + "-400", request);
    }

    // ==================== GENERIC FALLBACK ====================

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex, HttpServletRequest request) {
        // Une FeignException peut être enveloppée (circuit breaker /
        // NoFallbackAvailableException…) : on la déballe pour reporter le statut
        // amont (409, 403…) plutôt qu'un 500 opaque.
        FeignException feignCause = findFeignCause(ex);
        if (feignCause != null) {
            return buildFeignResponse(feignCause, request);
        }
        String traceId = UUID.randomUUID().toString();
        log.error("Unexpected error [traceId: {}, type: {}]: ", traceId, ex.getClass().getName(), ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                "Une erreur inattendue s'est produite. Veuillez contacter le support technique.",
                MODULE_PREFIX + "-500", request, traceId);
    }

    // ==================== HELPER METHODS ====================
    
    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String message, String errorCode, HttpServletRequest request) {
        return buildResponse(status, message, errorCode, request, UUID.randomUUID().toString());
    }

    private ResponseEntity<ErrorResponse> buildResponse(HttpStatus status, String message, String errorCode, HttpServletRequest request, String traceId) {
        ErrorResponse response = ErrorResponse.builder()
                .timestamp(LocalDateTime.now(ZoneId.systemDefault()).toString())
                .status(status.value())
                .errorCode(errorCode)
                .message(message)
                .path(request.getRequestURI())
                .traceId(traceId)
                .build();
        return new ResponseEntity<>(response, status);
    }
}